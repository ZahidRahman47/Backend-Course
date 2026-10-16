//allowed genres, shared by the seed, the validators and the filters.
export const GENRES = [
    "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime",
    "Documentary", "Drama", "Family", "Fantasy", "History", "Horror",
    "Music", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western",
];

//columns a client is allowed to sort by. never pass a raw client value into orderBy.
export const MOVIE_SORT_FIELDS = ["createdAt", "title", "releaseYear", "runtime"];

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
