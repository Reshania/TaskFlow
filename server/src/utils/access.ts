import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/httpError.js";
import type { AuthUser } from "../middleware/auth.js";

export function isAdmin(user: AuthUser) {
  return user.role === "ADMIN";
}

export function isPm(user: AuthUser) {
  return user.role === "PROJECT_MANAGER";
}

export function isDev(user: AuthUser) {
  return user.role === "DEVELOPER";
}

export async function assertProjectAccess(user: AuthUser, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: { select: { assigneeId: true } },
    },
  });
  if (!project) throw new HttpError(404, "Project not found");
  if (isAdmin(user)) return project;
  if (isPm(user) && project.createdById === user.id) return project;
  if (isDev(user) && project.tasks.some((t) => t.assigneeId === user.id)) return project;
  throw new HttpError(403, "You do not have access to this project");
}

export async function assertTaskAccess(user: AuthUser, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) throw new HttpError(404, "Task not found");
  if (isAdmin(user)) return task;
  if (isPm(user) && task.project.createdById === user.id) return task;
  if (isDev(user) && task.assigneeId === user.id) return task;
  throw new HttpError(403, "You do not have access to this task");
}

export function projectScopeWhere(user: AuthUser) {
  if (isAdmin(user)) return {};
  if (isPm(user)) return { createdById: user.id };
  return { tasks: { some: { assigneeId: user.id } } };
}

export function taskScopeWhere(user: AuthUser) {
  if (isAdmin(user)) return {};
  if (isPm(user)) return { project: { createdById: user.id } };
  return { assigneeId: user.id };
}

export const MANAGER_ROLES: Role[] = ["ADMIN", "PROJECT_MANAGER"];
