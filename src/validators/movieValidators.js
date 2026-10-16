import { z } from "zod";
import { GENRES, MOVIE_SORT_FIELDS, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../constants/movie.js";

const currentYear = new Date().getFullYear();

//accepts any casing ("sci-fi") and returns the stored spelling ("Sci-Fi").
const genre = z
    .string()
    .trim()
    .transform((value) => GENRES.find((g) => g.toLowerCase() === value.toLowerCase()) ?? value)
    .pipe(z.enum(GENRES, `Genre must be one of: ${GENRES.join(", ")}`));

//shared rules for the fields of a movie.
const movieFields = {
    title: z.string().trim().min(1, "Title is required.").max(200),
    overview: z.string().trim().max(2000).optional(),
    releaseYear: z.number().int().min(1888).max(currentYear + 5),
    genres: z.array(genre).optional(),
    runtime: z.number().int().positive().optional(),
    posterUrl: z.url("posterUrl must be a valid URL.").optional(),
};

const movieIdParams = z.object({
    id: z.uuid("Movie id must be a valid UUID."),
});

//query strings are always strings, so numbers need z.coerce.
const year = z.coerce.number().int().min(1888).max(currentYear + 5);
const minutes = z.coerce.number().int().positive();

//"?genres=Drama,Crime" or "?genres=Drama&genres=Crime" both become ["Drama", "Crime"].
const genreList = z.preprocess(
    (value) => (Array.isArray(value) ? value : String(value).split(",")).filter(Boolean),
    z.array(genre).min(1)
);

const listMoviesQuery = z
    .strictObject({
        //offset pagination
        page: z.coerce.number().int().min(1).optional(),
        //cursor pagination: id of the last movie from the previous page
        cursor: z.uuid("cursor must be a movie id.").optional(),
        limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),

        search: z.string().trim().min(2, "search needs at least 2 characters.").max(100).optional(),
        genres: genreList.optional(),
        minYear: year.optional(),
        maxYear: year.optional(),
        minRuntime: minutes.optional(),
        maxRuntime: minutes.optional(),

        sortBy: z.enum(MOVIE_SORT_FIELDS).default("createdAt"),
        order: z.enum(["asc", "desc"]).default("desc"),
    })
    .refine((q) => !(q.page && q.cursor), {
        message: "Use either page or cursor, not both.",
        path: ["cursor"],
    })
    .refine((q) => !q.minYear || !q.maxYear || q.minYear <= q.maxYear, {
        message: "minYear must be less than or equal to maxYear.",
        path: ["minYear"],
    })
    .refine((q) => !q.minRuntime || !q.maxRuntime || q.minRuntime <= q.maxRuntime, {
        message: "minRuntime must be less than or equal to maxRuntime.",
        path: ["minRuntime"],
    });

//each schema describes the parts of the request we check: params, query and/or body.
export const listMoviesSchema = z.object({
    query: listMoviesQuery,
});

export const getMovieSchema = z.object({
    params: movieIdParams,
});

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
