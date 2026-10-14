import express from 'express';
import { login, registerUser, logout } from "../controllers/authController.js";
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", login)
router.post("/logout", logout)

export default router;
