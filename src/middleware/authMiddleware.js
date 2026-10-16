import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";


export const authMiddleware = async (req, res, next) => {
    //token from "Authorization: Bearer <token>" (mobile apps, postman) or the jwt cookie (browsers).
    let token;
    if (req?.headers?.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1] //["Bearer" ,"askjdfhaslkdjfhlaskldjfhajhflaksjdhflasdjfhlasdfjh"]
    } else if (req.cookies?.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return res.status(401).json({
            error: "Not authorized, no token provided."
        })
    }

    //only the jwt check sits in the try. a database error below is a real 500
    //and goes to the error handler, it must not be reported as "token failed".
    let decoded;
    try {
        decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (error) {
        return res.status(401).json({
            error: error.name === "TokenExpiredError"
                ? "Not authorized, token expired."
                : "Not authorized, token invalid."
        })
    }

    //the user may have been deleted after the token was issued.
    //select never includes the password hash on req.user.
    const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, name: true, email: true, createdAt: true }
    })
    if (!user) {
        return res.status(401).json({
            error: "User no longer exists."
        })
    }

    req.user = user
    next();
}
