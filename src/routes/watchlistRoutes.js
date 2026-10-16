import express from 'express';
import { addToWatchlist, getWatchlist, getWatchlistStats, updateWatchlistItem, removeWatchlistItem } from '../controllers/watchlistController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
    addToWatchlistSchema,
    listWatchlistSchema,
    updateWatchlistItemSchema,
    removeWatchlistItemSchema,
} from '../validators/watchlistValidators.js';
const router = express.Router();


//every watchlist route needs a logged in user
router.use(authMiddleware);
router.get("/", validateRequest(listWatchlistSchema), getWatchlist);
//"/stats" must be registered before "/:movieId" style routes that could match it
router.get("/stats", getWatchlistStats);
router.post("/", validateRequest(addToWatchlistSchema), addToWatchlist);
router.patch("/:movieId", validateRequest(updateWatchlistItemSchema), updateWatchlistItem);
router.delete("/:movieId", validateRequest(removeWatchlistItemSchema), removeWatchlistItem)
export default router;
