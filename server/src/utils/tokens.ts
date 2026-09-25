import jwt, { type SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";

export type AccessPayload = {
  sub: string;
  role: Role;
  email: string;
};

export function signAccessToken(payload: AccessPayload) {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl } as SignOptions);
}

export function signRefreshToken(userId: string) {
  return jwt.sign({ sub: userId, jti: crypto.randomUUID() }, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTokenTtlDays}d`,
  } as SignOptions);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwtAccessSecret) as AccessPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.jwtRefreshSecret) as { sub: string; jti: string };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function refreshExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + env.refreshTokenTtlDays);
  return date;
}
