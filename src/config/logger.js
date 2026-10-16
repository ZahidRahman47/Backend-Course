//structured JSON logger. in production every log line is JSON so tools like
//datadog / cloudwatch / grafana loki can search it, in development it is pretty printed.
import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
    level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
    //never write secrets to the logs.
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            'res.headers["set-cookie"]',
            "*.password",
            "*.token",
        ],
        censor: "[REDACTED]",
    },
    transport: env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
        : undefined,
});
