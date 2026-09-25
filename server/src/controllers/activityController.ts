import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getRecentActivity } from "../services/activityService.js";

export const listActivity = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 20) || 20, 100);
  const activities = await getRecentActivity(req.user!, limit);
  res.json({ activities });
});
