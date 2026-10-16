// helper for generaing JWT token for the user's.
import jwt from "jsonwebtoken";
import { env, isProduction } from "../config/env.js";

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

export const generateToken = (userId, res) => {

    const payload = { id: userId };
    const token = jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN
    })
    res.cookie("jwt", token, {
        httpOnly: true,      //javascript in the browser can't read it, protects against XSS stealing it
        secure: isProduction, //only sent over https in production
        sameSite: "strict",  //not sent on requests from other sites, protects against CSRF
        maxAge: SEVEN_DAYS_MS
    })
    return token
}
