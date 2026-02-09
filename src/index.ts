import express from "express";
import cookieParser from "cookie-parser";
import { authRoutes } from "./routes/authRoutes";
import { env } from "./config/env";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/auth", authRoutes);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
