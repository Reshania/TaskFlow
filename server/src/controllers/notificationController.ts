import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const unreadOnly = req.query.unread === "true";
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id, ...(unreadOnly ? { read: false } : {}) },
    include: { task: { select: { id: true, title: true, projectId: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: req.user!.id, read: false },
  });
  res.json({ notifications, unreadCount });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: { read: true },
  });
  res.json({ updated: notification.count });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true },
  });
  res.json({ updated: result.count });
});
