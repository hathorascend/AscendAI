import { Router } from "express";
import { loginHandler, meHandler, registerHandler } from "../modules/auth/auth.controller";
import { authMiddleware } from "../middlewares/authMiddleware";

export const authRoutes = Router();

authRoutes.post("/register", registerHandler);
authRoutes.post("/login", loginHandler);
authRoutes.get("/me", authMiddleware, meHandler);
