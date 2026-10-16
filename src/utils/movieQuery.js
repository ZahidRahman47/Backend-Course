//turns the validated query string into a prisma `where` object.
export const buildMovieFilters = ({ search, genres, minYear, maxYear, minRuntime, maxRuntime }) => {
    const where = {};

    if (search) {
        //ILIKE '%search%' on title or overview
        where.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { overview: { contains: search, mode: "insensitive" } },
        ];
    }

    if (genres) {
        //movie has at least one of the requested genres
        where.genres = { hasSome: genres };
    }

    if (minYear || maxYear) {
        where.releaseYear = { gte: minYear, lte: maxYear };
    }

    if (minRuntime || maxRuntime) {
        where.runtime = { gte: minRuntime, lte: maxRuntime };
    }

    return where;
};

//always add id as a tie-breaker: many movies share a releaseYear, and without a
//unique last column the order between them is random, so rows repeat or go
//missing between pages.
export const buildMovieOrderBy = ({ sortBy, order }) => [
    { [sortBy]: order },
    { id: order },
];
