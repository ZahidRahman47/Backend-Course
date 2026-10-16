import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

//CORS: browsers block a frontend on another origin from reading our responses
//unless we allow that origin here. postman/curl ignore CORS completely.
export const corsMiddleware = cors({
    origin: (origin, callback) => {
        //no Origin header = same-origin request, server-to-server or postman.
        if (!origin || env.CORS_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        callback(null, false);
    },
    //allow the browser to send and receive the jwt cookie.
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id", "RateLimit", "RateLimit-Policy", "Retry-After"],
    //cache the preflight (OPTIONS) response for 10 minutes.
    maxAge: 600,
});

const rateLimitHandler = (req, res, next, options) => {
    res.status(options.statusCode).json({
        error: options.message
    })
}

//every route: 300 requests per 15 minutes per ip.
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    //automated tests send many requests from one ip.
    skip: () => env.NODE_ENV === "test",
    message: "Too many requests, please try again later.",
    handler: rateLimitHandler,
});

//login/register: 10 failed attempts per 15 minutes per ip, against password guessing.
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    //only failed logins count, a user logging in normally is never blocked.
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test",
    message: "Too many attempts, please try again in 15 minutes.",
    handler: rateLimitHandler,
});
