//checks req.params and req.body against a zod schema.
//on failure the ZodError goes to the global error middleware.
export const validateRequest = (schema) => (req, res, next) => {
    const result = schema.safeParse({
        params: req.params,
        body: req.body,
    });

    if (!result.success) {
        return next(result.error);
    }

    //replace with the parsed values (trimmed strings etc).
    if (result.data.params) req.params = result.data.params;
    if (result.data.body) req.body = result.data.body;
    next();
};
