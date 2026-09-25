import type { Request, Response } from "express";
import type { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, ValidationError } from "../utils/httpError.js";
import { isDate, isEnum, isString, optionalDate, optionalEnum, optionalId, validateBody } from "../utils/validate.js";
import { assertProjectAccess, assertTaskAccess, isAdmin, isDev, isPm, taskScopeWhere } from "../utils/access.js";
import { recordActivity } from "../services/activityService.js";
import { createNotification } from "../services/notificationService.js";

const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true, createdById: true, client: { select: { name: true } } } },
  activities: {
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" as const },
    take: 50,
  },
};

function parseFilters(query: Request["query"]): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};
  const status = query.status as string | undefined;
  const priority = query.priority as string | undefined;
  const dueFrom = query.dueFrom as string | undefined;
  const dueTo = query.dueTo as string | undefined;
  const projectId = query.projectId as string | undefined;
  const assigneeId = query.assigneeId as string | undefined;

  if (status) {
    const list = status.split(",").filter((s) => statuses.includes(s as TaskStatus)) as TaskStatus[];
    if (list.length) where.status = { in: list };
  }
  if (priority) {
    const list = priority.split(",").filter((p) => priorities.includes(p as TaskPriority)) as TaskPriority[];
    if (list.length) where.priority = { in: list };
  }
  if (dueFrom || dueTo) {
    where.dueDate = {
      ...(dueFrom && !Number.isNaN(Date.parse(dueFrom)) ? { gte: new Date(dueFrom) } : {}),
      ...(dueTo && !Number.isNaN(Date.parse(dueTo)) ? { lte: new Date(dueTo) } : {}),
    };
  }
  if (projectId) where.projectId = projectId;
  if (assigneeId) where.assigneeId = assigneeId;
  return where;
}

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const tasks = await prisma.task.findMany({
    where: { AND: [taskScopeWhere(req.user!), parseFilters(req.query)] },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, client: { select: { name: true } } } },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
  });
  res.json({ tasks });
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  await assertTaskAccess(req.user!, req.params.id);
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: req.params.id },
    include: taskInclude,
  });
  res.json({ task });
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  if (isDev(req.user!)) throw new HttpError(403, "Developers cannot create tasks");
  const errors = validateBody({
    title: isString(2, 200),
    description: isString(1, 8000),
    projectId: isString(1, 80),
    status: optionalEnum(statuses),
    priority: optionalEnum(priorities),
    dueDate: isDate,
    assigneeId: optionalId,
  })(req.body);
  if (Object.keys(errors).length) throw new ValidationError(errors);

  const project = await assertProjectAccess(req.user!, req.body.projectId);
  if (!isAdmin(req.user!) && project.createdById !== req.user!.id) {
    throw new HttpError(403, "You can only add tasks to your own projects");
  }

  if (req.body.assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: req.body.assigneeId } });
    if (!assignee || assignee.role !== "DEVELOPER") {
      throw new HttpError(400, "Assignee must be a developer");
    }
  }

  const task = await prisma.task.create({
    data: {
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      projectId: req.body.projectId,
      status: req.body.status ?? "TODO",
      priority: req.body.priority ?? "MEDIUM",
      dueDate: new Date(req.body.dueDate),
      assigneeId: req.body.assigneeId || null,
    },
    include: taskInclude,
  });

  await recordActivity({
    type: "TASK_CREATED",
    message: `${req.user!.name} created task "${task.title}"`,
    taskId: task.id,
    projectId: task.projectId,
    actorId: req.user!.id,
    toValue: task.status,
  });

  if (task.assigneeId) {
    await createNotification({
      userId: task.assigneeId,
      type: "TASK_ASSIGNED",
      title: "New task assigned",
      body: `${req.user!.name} assigned you "${task.title}"`,
      taskId: task.id,
    });
    await recordActivity({
      type: "ASSIGNMENT_CHANGE",
      message: `${req.user!.name} assigned "${task.title}" to ${task.assignee?.name ?? "a developer"}`,
      taskId: task.id,
      projectId: task.projectId,
      actorId: req.user!.id,
      toValue: task.assigneeId,
    });
  }

  const created = await prisma.task.findUniqueOrThrow({ where: { id: task.id }, include: taskInclude });
  res.status(201).json({ task: created });
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const existing = await assertTaskAccess(req.user!, req.params.id);
  const developer = isDev(req.user!);

  if (developer) {
    const allowed = ["status", "description"];
    const extra = Object.keys(req.body).filter((k) => !allowed.includes(k));
    if (extra.length) {
      throw new HttpError(403, "Developers can only update task status (and notes/description)");
    }
  }

  const errors = validateBody({
    title: (v) => (v === undefined ? null : isString(2, 200)(v)),
    description: (v) => (v === undefined ? null : isString(1, 8000)(v)),
    status: optionalEnum(statuses),
    priority: optionalEnum(priorities),
    dueDate: optionalDate,
    assigneeId: optionalId,
  })(req.body);
  if (Object.keys(errors).length) throw new ValidationError(errors);

  if (req.body.assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: req.body.assigneeId } });
    if (!assignee || assignee.role !== "DEVELOPER") {
      throw new HttpError(400, "Assignee must be a developer");
    }
  }

  const nextStatus: TaskStatus | undefined = req.body.status;
  const nextAssignee: string | null | undefined =
    req.body.assigneeId === undefined ? undefined : req.body.assigneeId || null;

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      ...(req.body.title ? { title: req.body.title.trim() } : {}),
      ...(req.body.description ? { description: req.body.description.trim() } : {}),
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(req.body.priority ? { priority: req.body.priority } : {}),
      ...(req.body.dueDate ? { dueDate: new Date(req.body.dueDate) } : {}),
      ...(nextAssignee !== undefined ? { assigneeId: nextAssignee } : {}),
    },
    include: taskInclude,
  });

  if (nextStatus && nextStatus !== existing.status) {
    await recordActivity({
      type: "STATUS_CHANGE",
      message: `${req.user!.name} moved "${task.title}" from ${existing.status} to ${nextStatus}`,
      taskId: task.id,
      projectId: task.projectId,
      actorId: req.user!.id,
      fromValue: existing.status,
      toValue: nextStatus,
    });

    if (nextStatus === "IN_REVIEW") {
      await createNotification({
        userId: task.project.createdById,
        type: "TASK_IN_REVIEW",
        title: "Task ready for review",
        body: `${req.user!.name} moved "${task.title}" to In Review`,
        taskId: task.id,
      });
    }
  }

  if (nextAssignee !== undefined && nextAssignee !== existing.assigneeId) {
    const newName = task.assignee?.name ?? "Unassigned";
    await recordActivity({
      type: "ASSIGNMENT_CHANGE",
      message: `${req.user!.name} changed assignee of "${task.title}" to ${newName}`,
      taskId: task.id,
      projectId: task.projectId,
      actorId: req.user!.id,
      fromValue: existing.assigneeId,
      toValue: nextAssignee,
    });
    if (nextAssignee) {
      await createNotification({
        userId: nextAssignee,
        type: "TASK_ASSIGNED",
        title: "Task assigned to you",
        body: `${req.user!.name} assigned you "${task.title}"`,
        taskId: task.id,
      });
    }
  }

  const updated = await prisma.task.findUniqueOrThrow({ where: { id: task.id }, include: taskInclude });
  res.json({ task: updated });
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const existing = await assertTaskAccess(req.user!, req.params.id);
  if (isDev(req.user!)) throw new HttpError(403, "Developers cannot delete tasks");
  if (isPm(req.user!) && existing.project.createdById !== req.user!.id) {
    throw new HttpError(403, "You can only delete tasks on your own projects");
  }
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
