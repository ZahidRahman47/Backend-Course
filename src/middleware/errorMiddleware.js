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

    //prisma errors.
    if (err.name === "PrismaClientKnownRequestError") {
        if (err.code === "P2002") {
            return res.status(409).json({ error: "Record already exists." })
        }
        if (err.code === "P2025") {
            return res.status(404).json({ error: "Record not found." })
        }
    }

    console.log(`Logged Error: ${err.stack || err}`);
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
        error: statusCode === 500 ? "Something went wrong." : err.message
    })
}
