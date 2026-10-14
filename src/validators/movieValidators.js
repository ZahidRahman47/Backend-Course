import { z } from "zod";

const currentYear = new Date().getFullYear();

//shared rules for the fields of a movie.
const movieFields = {
    title: z.string().trim().min(1, "Title is required.").max(200),
    overview: z.string().trim().max(2000).optional(),
    releaseYear: z.number().int().min(1888).max(currentYear + 5),
    genres: z.array(z.string().trim().min(1)).optional(),
    runtime: z.number().int().positive().optional(),
    posterUrl: z.url("posterUrl must be a valid URL.").optional(),
};

const movieIdParams = z.object({
    id: z.uuid("Movie id must be a valid UUID."),
});

//each schema describes the parts of the request we check: params and/or body.
export const createMovieSchema = z.object({
    body: z.strictObject(movieFields),
});

export const updateMovieSchema = z.object({
    params: movieIdParams,
    body: z
        .strictObject(movieFields)
        .partial()
        .refine((data) => Object.keys(data).length > 0, {
            message: "Provide at least one field to update.",
        }),
});

export const deleteMovieSchema = z.object({
    params: movieIdParams,
});
