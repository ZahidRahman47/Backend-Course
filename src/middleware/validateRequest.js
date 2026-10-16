//checks req.params, req.query and req.body against a zod schema.
//on failure the ZodError goes to the global error middleware.
export const validateRequest = (schema) => (req, res, next) => {
    const result = schema.safeParse({
        params: req.params,
        query: req.query,
        body: req.body,
    });

    if (!result.success) {
        return next(result.error);
    }

    //replace with the parsed values (trimmed strings, numbers, defaults etc).
    if (result.data.params) req.params = result.data.params;
    if (result.data.body) req.body = result.data.body;
    //in express 5 req.query is a getter, so it can't be assigned directly.
    if (result.data.query) {
        Object.defineProperty(req, "query", { value: result.data.query, writable: true });
    }
    next();
};
