//starts the http server and handles shutdown. the app itself lives in app.js.
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js'
import app from './app.js';

//connect first, so we never accept requests we can't serve.
await connectDB();

const server = app.listen(env.PORT, () => {
    logger.info(`Server is running on port ${env.PORT} (${env.NODE_ENV})`);
});

//graceful shutdown: stop taking new requests, let running requests finish,
//then close the database connection. used on deploys, restarts and crashes.
let shuttingDown = false;
const shutdown = (reason, exitCode) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${reason} received, shutting down gracefully`);

    //if requests hang, don't wait forever.
    setTimeout(() => {
        logger.error("Could not finish in time, forcing shutdown");
        process.exit(1);
    }, 10_000).unref();

    server.close(async () => {
        await disconnectDB();
        logger.info("Process terminated!");
        process.exit(exitCode);
    });
};

//SIGTERM: sent by docker / kubernetes / heroku when stopping the app. SIGINT: ctrl+c.
process.on("SIGTERM", () => shutdown("SIGTERM", 0));
process.on("SIGINT", () => shutdown("SIGINT", 0));

//bugs: the app is in an unknown state, so log it and restart cleanly.
process.on("unhandledRejection", (err) => {
    logger.fatal({ err }, "Unhandled promise rejection");
    shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
    shutdown("uncaughtException", 1);
});
