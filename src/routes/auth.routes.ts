import { Router } from "express";
import { register, login, getProfile } from "../controllers/auth.controller.js";

// @ts-ignore
import { authenticateToken } from "#middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authenticateToken, getProfile);

export default router;
