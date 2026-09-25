import { Router } from "express";
import { listActivity } from "../controllers/activityController.js";
import { listNotifications, markAllRead, markRead } from "../controllers/notificationController.js";
import { getDashboard } from "../controllers/dashboardController.js";

export const activityRouter = Router();
activityRouter.get("/", listActivity);

export const notificationRouter = Router();
notificationRouter.get("/", listNotifications);
notificationRouter.patch("/read-all", markAllRead);
notificationRouter.patch("/:id/read", markRead);

export const dashboardRouter = Router();
dashboardRouter.get("/", getDashboard);
