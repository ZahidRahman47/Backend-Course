//builds the express app. it does not call listen(), so tests can import the app
//and send requests to it without starting a real server (see server.js).
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { corsMiddleware, apiLimiter } from "./middleware/securityMiddleware.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

//import Routes.
import healthRoutes from "./routes/healthRoutes.js";
import movieRoutes from "./routes/movieRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";

const app = express();

//behind a proxy the client ip is in X-Forwarded-For, the rate limiter needs the real ip.
app.set("trust proxy", env.TRUST_PROXY);

//order matters: middlewares run top to bottom for every request.
app.use(requestLogger)    //first, so every later log has the request id
app.use(helmet())          //security headers, also removes X-Powered-By: Express
app.use(corsMiddleware)    //before routes so preflight OPTIONS requests are answered
app.use(compression())     //gzip responses, a 20 movie page shrinks a lot

//body parser middleware logic, with a size limit against huge payloads
app.use(express.json({ limit: "10kb" }))
app.use(express.urlencoded({ extended: true, limit: "10kb" }))
app.use(cookieParser())

//health checks are not rate limited, the load balancer calls them all the time
app.use('/health', healthRoutes);

app.use(apiLimiter)

//core middlewares
app.use('/movies', movieRoutes);
app.use('/auth', authRoutes);
app.use('/watchlist', watchlistRoutes)

//error middlewares, must stay after the routes
app.use(notFound)
app.use(errorHandler)

export default app;
