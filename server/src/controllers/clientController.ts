import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, ValidationError } from "../utils/httpError.js";
import { isEmail, isString, optionalString, validateBody } from "../utils/validate.js";
import { isAdmin, isPm } from "../utils/access.js";

const createRules = validateBody({
  name: isString(2, 120),
  company: isString(2, 120),
  email: isEmail,
  phone: optionalString(40),
  notes: optionalString(2000),
});

async function assertClientAccess(req: Request, clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { projects: { select: { createdById: true } } },
  });
  if (!client) throw new HttpError(404, "Client not found");
  if (isAdmin(req.user!)) return client;
  const owns = client.createdById === req.user!.id || client.projects.some((p) => p.createdById === req.user!.id);
  if (!owns) throw new HttpError(403, "You do not have access to this client");
  return client;
}

export const listClients = asyncHandler(async (req: Request, res: Response) => {
  const where = isAdmin(req.user!)
    ? {}
    : { OR: [{ createdById: req.user!.id }, { projects: { some: { createdById: req.user!.id } } }] };
  const clients = await prisma.client.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { projects: true } },
    },
    orderBy: { name: "asc" },
  });
  res.json({ clients });
});

export const getClient = asyncHandler(async (req: Request, res: Response) => {
  await assertClientAccess(req, req.params.id);
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      projects: { include: { _count: { select: { tasks: true } } } },
    },
  });
  res.json({ client });
});

export const createClient = asyncHandler(async (req: Request, res: Response) => {
  const errors = createRules(req.body);
  if (Object.keys(errors).length) throw new ValidationError(errors);
  const client = await prisma.client.create({
    data: {
      name: req.body.name.trim(),
      company: req.body.company.trim(),
      email: req.body.email.toLowerCase().trim(),
      phone: req.body.phone || null,
      notes: req.body.notes || null,
      createdById: req.user!.id,
    },
  });
  res.status(201).json({ client });
});

export const updateClient = asyncHandler(async (req: Request, res: Response) => {
  await assertClientAccess(req, req.params.id);
  const errors = validateBody({
    name: (v) => (v === undefined ? null : isString(2, 120)(v)),
    company: (v) => (v === undefined ? null : isString(2, 120)(v)),
    email: (v) => (v === undefined ? null : isEmail(v)),
    phone: optionalString(40),
    notes: optionalString(2000),
  })(req.body);
  if (Object.keys(errors).length) throw new ValidationError(errors);

  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: {
      ...(req.body.name ? { name: req.body.name.trim() } : {}),
      ...(req.body.company ? { company: req.body.company.trim() } : {}),
      ...(req.body.email ? { email: req.body.email.toLowerCase().trim() } : {}),
      ...(req.body.phone !== undefined ? { phone: req.body.phone || null } : {}),
      ...(req.body.notes !== undefined ? { notes: req.body.notes || null } : {}),
    },
  });
  res.json({ client });
});

export const deleteClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await assertClientAccess(req, req.params.id);
  if (isPm(req.user!) && client.createdById !== req.user!.id && !isAdmin(req.user!)) {
    throw new HttpError(403, "Only the creator or an admin can delete this client");
  }
  await prisma.client.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
