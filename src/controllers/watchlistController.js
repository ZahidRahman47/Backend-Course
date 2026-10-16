import { prisma } from "../config/db.js";


const addToWatchlist = async (req, res) => {
    const { movieId, status, rating, notes,  } = req.body

    //verify movie exits or not .

    const movie = await prisma.movie.findUnique({
        where: { id: movieId },
    })
    if (!movie) {
        return res.status(404).json({
            error: "Movie not found."
        })
    }

    //checking already added
    const existingInWatchlist = await prisma.watchlistItem.findUnique({
        where: {
            userId_movieId: {
                userId: req.user.id,
                movieId: movieId
            }
        }
    })

    if (existingInWatchlist) {
        return res.status(409).json({
            error: "movie already in the watchlist."
        })
    }

    const watchlistItem = await prisma.watchlistItem.create({
        data: {
            userId :req.user.id,
            movieId,
            status: status || "PLANNED",
            rating,
            notes
        }
    })

    res.status(201).json({
        status: "Success",
        data: {
            watchlistItem
        }
    })

}

//GET /watchlist?status=&page=&limit=&sortBy=&order=
const getWatchlist = async (req, res) => {
    const { status, page, limit, sortBy, order } = req.query
    //always scoped to the logged in user, a user can never read someone else's list.
    const where = { userId: req.user.id, ...(status && { status }) }

    const [total, items] = await prisma.$transaction([
        prisma.watchlistItem.count({ where }),
        prisma.watchlistItem.findMany({
            where,
            //unrated items go last. "nulls" is only allowed on nullable columns like rating.
            orderBy: [
                { [sortBy]: sortBy === "rating" ? { sort: order, nulls: "last" } : order },
                { id: order },
            ],
            skip: (page - 1) * limit,
            take: limit,
            //include loads the movies of the whole page in one extra query,
            //not one query per item (that would be the N+1 problem).
            include: {
                movie: {
                    select: { id: true, title: true, releaseYear: true, genres: true, runtime: true, posterUrl: true }
                }
            }
        }),
    ])
    const totalPages = Math.ceil(total / limit)

    res.status(200).json({
        status: "Success",
        data: {
            items
        },
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        }
    })
}

//GET /watchlist/stats: counts per status and average rating, calculated by the database.
const getWatchlistStats = async (req, res) => {
    const where = { userId: req.user.id }

    const [byStatus, ratings] = await prisma.$transaction([
        //SELECT status, COUNT(*) FROM "WatchlistItem" WHERE "userId" = $1 GROUP BY status
        prisma.watchlistItem.groupBy({
            by: ["status"],
            where,
            _count: { _all: true },
            orderBy: { status: "asc" },
        }),
        prisma.watchlistItem.aggregate({
            where,
            _avg: { rating: true },
            _count: { rating: true, _all: true },
        }),
    ])

    //every status is in the response, also the ones with 0 movies.
    const counts = { PLANNED: 0, WATCHING: 0, COMPLETED: 0, DROPPED: 0 }
    for (const row of byStatus) counts[row.status] = row._count._all

    res.status(200).json({
        status: "Success",
        data: {
            total: ratings._count._all,
            byStatus: counts,
            ratedCount: ratings._count.rating,
            averageRating: ratings._avg.rating === null ? null : Number(ratings._avg.rating.toFixed(1)),
        }
    })
}

//PATCH /watchlist/:movieId, change status, rating or notes.
const updateWatchlistItem = async (req, res) => {
    const { movieId } = req.params

    const existingInWatchlist = await prisma.watchlistItem.findUnique({
        where: {
            userId_movieId: {
                userId: req.user.id,
                movieId: movieId
            }
        }
    })

    if (!existingInWatchlist) {
        return res.status(404).json({
            error: "Movie not found in the watchlist."
        })
    }

    const watchlistItem = await prisma.watchlistItem.update({
        where: { id: existingInWatchlist.id },
        data: req.body
    })

    res.status(200).json({
        status: "Success",
        data: {
            watchlistItem
        }
    })
}

const removeWatchlistItem = async (req, res) => {
    const { movieId } = req.params
    //checking item exists in the watchlist
    const existingInWatchlist = await prisma.watchlistItem.findUnique({
        where: {
            userId_movieId: {
                userId: req.user.id,
                movieId: movieId
            }
        }
    })

    if (!existingInWatchlist) {
        return res.status(404).json({
            error: "Movie not found in the watchlist."
        })
    }

    await prisma.watchlistItem.delete({
        where: { id: existingInWatchlist.id }
    })

    res.status(200).json({
        status: "Success",
        message: "Movie removed from the watchlist."
    })

}
export { addToWatchlist, getWatchlist, getWatchlistStats, updateWatchlistItem, removeWatchlistItem }
