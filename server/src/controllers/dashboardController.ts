import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { projectScopeWhere, taskScopeWhere } from "../utils/access.js";

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const taskWhere = taskScopeWhere(user);
  const projectWhere = projectScopeWhere(user);
  const now = new Date();

  const [projects, tasks, users, clients, unread] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      include: { _count: { select: { tasks: true } }, client: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: taskWhere,
      include: { project: { select: { name: true } }, assignee: { select: { name: true } } },
    }),
    user.role === "ADMIN" ? prisma.user.groupBy({ by: ["role"], _count: true }) : Promise.resolve([]),
    user.role === "ADMIN"
      ? prisma.client.count()
      : prisma.client.count({
          where: { OR: [{ createdById: user.id }, { projects: { some: { createdById: user.id } } }] },
        }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  const byStatus = {
    TODO: tasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    IN_REVIEW: tasks.filter((t) => t.status === "IN_REVIEW").length,
    DONE: tasks.filter((t) => t.status === "DONE").length,
  };
  const byPriority = {
    LOW: tasks.filter((t) => t.priority === "LOW").length,
    MEDIUM: tasks.filter((t) => t.priority === "MEDIUM").length,
    HIGH: tasks.filter((t) => t.priority === "HIGH").length,
    URGENT: tasks.filter((t) => t.priority === "URGENT").length,
  };
  const overdue = tasks.filter((t) => t.status !== "DONE" && t.dueDate < now);
  const dueSoon = tasks.filter((t) => {
    const inThree = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return t.status !== "DONE" && t.dueDate >= now && t.dueDate <= inThree;
  });

  res.json({
    stats: {
      projectCount: projects.length,
      taskCount: tasks.length,
      clientCount: clients,
      unreadNotifications: unread,
      byStatus,
      byPriority,
      overdueCount: overdue.length,
      dueSoonCount: dueSoon.length,
      completionRate: tasks.length ? Math.round((byStatus.DONE / tasks.length) * 100) : 0,
      usersByRole: Array.isArray(users) ? users : [],
    },
    overdue: overdue.slice(0, 8),
    dueSoon: dueSoon.slice(0, 8),
    projects: projects.slice(0, 8),
  });
});
