import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { logger } from "../config/logger.js";

//a request id ties together every log line of one request. if a gateway or
//frontend already sent one we keep it, so the id can be traced across services.
const getRequestId = (req, res) => {
    const incoming = req.headers["x-request-id"];
    const id = typeof incoming === "string" && /^[\w-]{1,100}$/.test(incoming)
        ? incoming
        : randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
};

//logs one line per request with method, url, status and response time.
//it also gives every handler req.log, a logger that already includes the request id.
export const requestLogger = pinoHttp({
    logger,
    genReqId: getRequestId,
    customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
    },
    //health checks run every few seconds, logging them is just noise.
    autoLogging: { ignore: (req) => req.url.startsWith("/health") },
    serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
    },
});
