import { prisma } from "../config/db.js";


const getMovies = async (req, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: { createdAt: "desc" }
    })

    res.status(200).json({
        status: "Success",
        data: {
            movies
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

export { getMovies, createMovie, updateMovie, deleteMovie }
