import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";


export const authMiddleware = async (req, res, next) => {
    console.log("Auth middleware reached.");

    let token;
    if (req?.headers?.authorization?.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1] //["Bearer" ,"askjdfhaslkdjfhlaskldjfhajhflaksjdhflasdjfhlasdfjh"]
    } else
        if (req.cookies?.jwt) {
            token = req.cookies?.jwt;
        }

    if (!token) {
        return res.status(401).json({
            error: "not authorized no token provided."
        })
    }


    try {
        const decode = jwt?.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decode.id }
        })
        if (!user) {
            return res.status(401).json({
                error: "User no longer Exists. "
            })
        }
        req.user = user
        next();
    } catch (error) {
        return res.status(400).json({
            error: "Not Authorized! , token failed"
        })
    }

}

