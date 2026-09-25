import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/users.js";
import { clientRouter } from "./routes/clients.js";
import { projectRouter } from "./routes/projects.js";
import { taskRouter } from "./routes/tasks.js";
import { activityRouter, dashboardRouter, notificationRouter } from "./routes/misc.js";

export function createApp() {
  const app = express();
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/users", requireAuth, userRouter);
  app.use("/api/clients", requireAuth, clientRouter);
  app.use("/api/projects", requireAuth, projectRouter);
  app.use("/api/tasks", requireAuth, taskRouter);
  app.use("/api/activity", requireAuth, activityRouter);
  app.use("/api/notifications", requireAuth, notificationRouter);
  app.use("/api/dashboard", requireAuth, dashboardRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
