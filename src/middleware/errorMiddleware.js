import { ZodError } from "zod";

//runs when no route matched the request.
export const notFound = (req, res, next) => {
    res.status(404).json({
        error: `Route not found: ${req.method} ${req.originalUrl}`
    })
}

//global error handler, express knows it by the 4 arguments.
export const errorHandler = (err, req, res, next) => {
    //zod validation errors from validateRequest.
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: "Validation failed.",
            details: err.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message
            }))
        })
    }

    //body is not valid JSON.
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            error: "Invalid JSON in request body."
        })
    }

    //body bigger than the limit in express.json().
    if (err.type === "entity.too.large") {
        return res.status(413).json({
            error: "Request body is too large."
        })
    }

    //prisma errors.
    if (err.name === "PrismaClientKnownRequestError") {
        if (err.code === "P2002") {
            return res.status(409).json({ error: "Record already exists." })
        }
        if (err.code === "P2025") {
            return res.status(404).json({ error: "Record not found." })
        }
    }

    const statusCode = err.statusCode || err.status || 500;

    //expected client errors (4xx) keep their message. for 5xx the real error is
    //logged with the stack trace but the client only gets a generic message,
    //so internals (sql, file paths) never leak.
    if (statusCode < 500) {
        return res.status(statusCode).json({ error: err.message })
    }

    req.log.error({ err }, "Unhandled error");
    res.status(statusCode).json({
        error: "Something went wrong.",
        //the client can report this id and we can find the exact log line.
        requestId: req.id
    })
}
