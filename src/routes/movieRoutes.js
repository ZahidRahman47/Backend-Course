import express from "express";
import { getMovies, getMovieById, createMovie, updateMovie, deleteMovie } from "../controllers/movieController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { listMoviesSchema, getMovieSchema, createMovieSchema, updateMovieSchema, deleteMovieSchema } from "../validators/movieValidators.js";

const router = express.Router();


//public
router.get('/', validateRequest(listMoviesSchema), getMovies);
router.get('/:id', validateRequest(getMovieSchema), getMovieById);

//logged in users only
router.post('/', authMiddleware, validateRequest(createMovieSchema), createMovie);
router.put('/:id', authMiddleware, validateRequest(updateMovieSchema), updateMovie);
router.delete('/:id', authMiddleware, validateRequest(deleteMovieSchema), deleteMovie);

export default router;
