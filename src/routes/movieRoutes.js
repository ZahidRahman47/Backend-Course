import express from "express";
import { getMovies, createMovie, updateMovie, deleteMovie } from "../controllers/movieController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createMovieSchema, updateMovieSchema, deleteMovieSchema } from "../validators/movieValidators.js";

const router = express.Router();


//public
router.get('/', getMovies);

//logged in users only
router.post('/', authMiddleware, validateRequest(createMovieSchema), createMovie);
router.put('/:id', authMiddleware, validateRequest(updateMovieSchema), updateMovie);
router.delete('/:id', authMiddleware, validateRequest(deleteMovieSchema), deleteMovie);

export default router;
