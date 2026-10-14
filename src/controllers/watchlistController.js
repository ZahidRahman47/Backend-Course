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
        return res.status(400).json({
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
export { addToWatchlist ,removeWatchlistItem }