import type { Request, Response } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, ValidationError } from "../utils/httpError.js";
import { hashPassword } from "../utils/tokens.js";
import { isEmail, isEnum, isString, optionalEnum, validateBody } from "../utils/validate.js";

const roles: Role[] = ["ADMIN", "PROJECT_MANAGER", "DEVELOPER"];

const createRules = validateBody({
  name: isString(2, 80),
  email: isEmail,
  password: isString(8, 128),
  role: isEnum(roles),
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const role = req.query.role as string | undefined;
  const users = await prisma.user.findMany({
    where: role && roles.includes(role as Role) ? { role: role as Role } : undefined,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  res.json({ users });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const errors = createRules(req.body);
  if (Object.keys(errors).length) throw new ValidationError(errors);

  const email = String(req.body.email).toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, "Email already in use");

  const user = await prisma.user.create({
    data: {
      name: req.body.name.trim(),
      email,
      passwordHash: await hashPassword(req.body.password),
      role: req.body.role,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  res.status(201).json({ user });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const errors = validateBody({
    name: (v) => (v === undefined ? null : isString(2, 80)(v)),
    role: optionalEnum(roles),
    password: (v) => (v === undefined || v === "" ? null : isString(8, 128)(v)),
  })(req.body);
  if (Object.keys(errors).length) throw new ValidationError(errors);

  const data: Record<string, unknown> = {};
  if (req.body.name) data.name = req.body.name.trim();
  if (req.body.role) data.role = req.body.role;
  if (req.body.password) data.passwordHash = await hashPassword(req.body.password);

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  res.json({ user });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.id === req.params.id) {
    throw new HttpError(400, "You cannot delete your own account");
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export const listDevelopers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { role: "DEVELOPER" },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  res.json({ users });
});
