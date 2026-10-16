import express from "express";
import { prisma } from "../config/db.js";

const router = express.Router();

//liveness: is the process up? used by docker / kubernetes to restart a dead container.
router.get("/", (req, res) => {
    res.status(200).json({
        status: "ok",
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    })
});

//readiness: can we serve traffic? checks the database, so a load balancer
//stops sending requests to an instance that lost its db connection.
router.get("/ready", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: "ready", database: "up" })
    } catch (error) {
        req.log.error({ err: error }, "Readiness check failed");
        res.status(503).json({ status: "not ready", database: "down" })
    }
});

export default router;
