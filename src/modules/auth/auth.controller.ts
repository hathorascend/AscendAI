import type { Request, Response } from "express";
import { loginUser, registerUser } from "./auth.service";

export async function registerHandler(req: Request, res: Response) {
  const { name, email, password, timezone } = req.body;

  if (!name || !email || !password || !timezone) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const user = await registerUser({ name, email, password, timezone });

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan_active: user.plan_active,
      timezone: user.timezone,
      created_at: user.created_at,
    });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  try {
    const { user, token } = await loginUser(email, password);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan_active: user.plan_active,
      timezone: user.timezone,
    });
  } catch (error) {
    return res.status(401).json({ message: (error as Error).message });
  }
}

export async function meHandler(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.status(200).json({ user: req.user });
}
