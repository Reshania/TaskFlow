import type { Request, Response } from "express";
import type { ProjectStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, ValidationError } from "../utils/httpError.js";
import { isEnum, isString, optionalEnum, validateBody } from "../utils/validate.js";
import { assertProjectAccess, isAdmin, isDev, projectScopeWhere } from "../utils/access.js";

const statuses: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];

export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const projects = await prisma.project.findMany({
    where: {
      ...projectScopeWhere(req.user!),
      ...(status && statuses.includes(status as ProjectStatus) ? { status: status as ProjectStatus } : {}),
    },
    include: {
      client: { select: { id: true, name: true, company: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ projects });
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  await assertProjectAccess(req.user!, req.params.id);
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      client: true,
      createdBy: { select: { id: true, name: true, email: true } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          activities: {
            include: { actor: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });
  res.json({ project });
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  if (isDev(req.user!)) throw new HttpError(403, "Developers cannot create projects");
  const errors = validateBody({
    name: isString(2, 160),
    description: isString(1, 4000),
    clientId: isString(1, 80),
    status: optionalEnum(statuses),
  })(req.body);
  if (Object.keys(errors).length) throw new ValidationError(errors);

  const client = await prisma.client.findUnique({ where: { id: req.body.clientId } });
  if (!client) throw new HttpError(404, "Client not found");

  const project = await prisma.project.create({
    data: {
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      clientId: req.body.clientId,
      createdById: req.user!.id,
      status: req.body.status ?? "ACTIVE",
    },
    include: { client: true },
  });
  res.status(201).json({ project });
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const existing = await assertProjectAccess(req.user!, req.params.id);
  if (!isAdmin(req.user!) && existing.createdById !== req.user!.id) {
    throw new HttpError(403, "Only the project creator or an admin can update this project");
  }
  const errors = validateBody({
    name: (v) => (v === undefined ? null : isString(2, 160)(v)),
    description: (v) => (v === undefined ? null : isString(1, 4000)(v)),
    status: optionalEnum(statuses),
  })(req.body);
  if (Object.keys(errors).length) throw new ValidationError(errors);

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...(req.body.name ? { name: req.body.name.trim() } : {}),
      ...(req.body.description ? { description: req.body.description.trim() } : {}),
      ...(req.body.status ? { status: req.body.status } : {}),
    },
    include: { client: true },
  });
  res.json({ project });
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const existing = await assertProjectAccess(req.user!, req.params.id);
  if (!isAdmin(req.user!) && existing.createdById !== req.user!.id) {
    throw new HttpError(403, "Only the project creator or an admin can delete this project");
  }
  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
