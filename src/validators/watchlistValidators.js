import { z } from "zod";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../constants/movie.js";

//same values as the WatchlistStatus enum in schema.prisma
export const WATCHLIST_STATUSES = ["PLANNED", "WATCHING", "COMPLETED", "DROPPED"];

const status = z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.enum(WATCHLIST_STATUSES, `Status must be one of: ${WATCHLIST_STATUSES.join(", ")}`));

const itemFields = {
    status: status.optional(),
    rating: z.number().int().min(1).max(10).optional(),
    notes: z.string().trim().max(500).optional(),
};

const movieIdParams = z.object({
    movieId: z.uuid("movieId must be a valid UUID."),
});

export const addToWatchlistSchema = z.object({
    body: z.strictObject({
        movieId: z.uuid("movieId must be a valid UUID."),
        ...itemFields,
    }),
});

export const listWatchlistSchema = z.object({
    query: z.strictObject({
        status: status.optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
        sortBy: z.enum(["createdAt", "updatedAt", "rating"]).default("updatedAt"),
        order: z.enum(["asc", "desc"]).default("desc"),
    }),
});

export const updateWatchlistItemSchema = z.object({
    params: movieIdParams,
    body: z
        .strictObject({
            ...itemFields,
            //null clears a rating or notes
            rating: itemFields.rating.nullable(),
            notes: itemFields.notes.nullable(),
        })
        .refine((data) => Object.keys(data).length > 0, {
            message: "Provide at least one field to update.",
        }),
});

export const removeWatchlistItemSchema = z.object({
    params: movieIdParams,
});
