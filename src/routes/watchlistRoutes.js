import express from 'express';
import { login, logout } from "../controllers/authController.js";
import { addToWatchlist, removeWatchlistItem } from '../controllers/watchlistController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
const router = express.Router();


router.use(authMiddleware);
router.post("/", addToWatchlist);
router.delete("/:movieId", removeWatchlistItem)
router.post("/logout", logout)
export default router;
