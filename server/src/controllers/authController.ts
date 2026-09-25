import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, ValidationError } from "../utils/httpError.js";
import {
  hashPassword,
  hashToken,
  refreshExpiry,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from "../utils/tokens.js";
import { clearRefreshCookie, setRefreshCookie } from "../utils/cookies.js";
import { isEmail, isString, validateBody } from "../utils/validate.js";
import { REFRESH_COOKIE } from "../config/env.js";

const loginRules = validateBody({
  email: isEmail,
  password: isString(8, 128),
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const errors = loginRules(req.body);
  if (Object.keys(errors).length) throw new ValidationError(errors);

  const email = String(req.body.email).toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(req.body.password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: refreshExpiry(),
    },
  });
  setRefreshCookie(res, refreshToken);

  res.json({
    accessToken,
    user: publicUser(user),
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) throw new HttpError(401, "Refresh token missing");

  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new HttpError(401, "Invalid refresh token");
  }

  const tokenHash = hashToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.userId !== payload.sub || stored.expiresAt < new Date()) {
    throw new HttpError(401, "Refresh token is invalid or expired");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new HttpError(401, "User no longer exists");

  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const nextRefresh = signRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(nextRefresh),
      userId: user.id,
      expiresAt: refreshExpiry(),
    },
  });
  setRefreshCookie(res, nextRefresh);

  res.json({ accessToken, user: publicUser(user) });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  clearRefreshCookie(res);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: req.user });
});

function publicUser(user: { id: string; name: string; email: string; role: string }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
