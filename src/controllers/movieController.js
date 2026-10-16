import { prisma } from "../config/db.js";
import { buildMovieFilters, buildMovieOrderBy } from "../utils/movieQuery.js";

//only the columns the list needs, not SELECT *.
const movieListFields = {
    id: true,
    title: true,
    releaseYear: true,
    genres: true,
    runtime: true,
    posterUrl: true,
    createdAt: true,
}

//GET /movies?search=&genres=&minYear=&maxYear=&minRuntime=&maxRuntime=&sortBy=&order=&page=&limit=&cursor=
const getMovies = async (req, res) => {
    const { page, cursor, limit } = req.query
    const where = buildMovieFilters(req.query)
    const orderBy = buildMovieOrderBy(req.query)

    //cursor pagination: continue after the last movie the client saw.
    //no COUNT(*) and no OFFSET, so it stays fast on deep pages.
    if (cursor) {
        //fetch one extra row to know if there is a next page.
        const rows = await prisma.movie.findMany({
            where,
            orderBy,
            select: movieListFields,
            cursor: { id: cursor },
            skip: 1, //skip the cursor row itself
            take: limit + 1,
        })
        const hasNextPage = rows.length > limit
        const movies = hasNextPage ? rows.slice(0, limit) : rows

        return res.status(200).json({
            status: "Success",
            data: { movies },
            pagination: {
                limit,
                hasNextPage,
                nextCursor: hasNextPage ? movies[movies.length - 1].id : null,
            }
        })
    }

    //offset pagination: page numbers and a total count.
    const currentPage = page ?? 1
    //run both queries in one transaction so the count and the rows agree.
    const [total, movies] = await prisma.$transaction([
        prisma.movie.count({ where }),
        prisma.movie.findMany({
            where,
            orderBy,
            select: movieListFields,
            skip: (currentPage - 1) * limit,
            take: limit,
        }),
    ])
    const totalPages = Math.ceil(total / limit)

    res.status(200).json({
        status: "Success",
        data: { movies },
        pagination: {
            page: currentPage,
            limit,
            total,
            totalPages,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1,
            //lets the client switch to cursor pagination from here.
            nextCursor: movies.length ? movies[movies.length - 1].id : null,
        }
    })
}

const getMovieById = async (req, res) => {
    const movie = await prisma.movie.findUnique({
        where: { id: req.params.id },
        include: {
            creator: { select: { id: true, name: true } },
            //how many users have this movie in their watchlist
            _count: { select: { watchlistItems: true } },
        }
    })
    if (!movie) {
        return res.status(404).json({
            error: "Movie not found."
        })
    }

    res.status(200).json({
        status: "Success",
        data: {
            movie
        }
    })
}

const createMovie = async (req, res) => {
    const movie = await prisma.movie.create({
        data: {
            ...req.body,
            createdBy: req.user.id
        }
    })

    res.status(201).json({
        status: "Success",
        data: {
            movie
        }
    })
}

const updateMovie = async (req, res) => {
    const { id } = req.params

    //verify movie exists.
    const movie = await prisma.movie.findUnique({
        where: { id }
    })
    if (!movie) {
        return res.status(404).json({
            error: "Movie not found."
        })
    }

    //only the user who created the movie can update it.
    if (movie.createdBy !== req.user.id) {
        return res.status(403).json({
            error: "You are not allowed to update this movie."
        })
    }

    const updatedMovie = await prisma.movie.update({
        where: { id },
        data: req.body
    })

    res.status(200).json({
        status: "Success",
        data: {
            movie: updatedMovie
        }
    })
}

const deleteMovie = async (req, res) => {
    const { id } = req.params

    const movie = await prisma.movie.findUnique({
        where: { id }
    })
    if (!movie) {
        return res.status(404).json({
            error: "Movie not found."
        })
    }

    if (movie.createdBy !== req.user.id) {
        return res.status(403).json({
            error: "You are not allowed to delete this movie."
        })
    }

    await prisma.movie.delete({
        where: { id }
    })

    res.status(200).json({
        status: "Success",
        message: "Movie deleted."
    })
}

export { getMovies, getMovieById, createMovie, updateMovie, deleteMovie }
