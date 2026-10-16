import express from 'express';
import { login, registerUser, logout, getMe } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/securityMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { registerSchema, loginSchema } from "../validators/authValidators.js";
const router = express.Router();

router.post("/register", authLimiter, validateRequest(registerSchema), registerUser);
router.post("/login", authLimiter, validateRequest(loginSchema), login)
router.post("/logout", logout)
router.get("/me", authMiddleware, getMe)

export default router;
