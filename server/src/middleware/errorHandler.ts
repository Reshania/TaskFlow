import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { HttpError } from "../utils/httpError.js";
import { env } from "../config/env.js";

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, "Route not found"));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A record with that unique value already exists" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
  }

  console.error(err);
  return res.status(500).json({
    error: env.nodeEnv === "production" ? "Internal server error" : String(err),
  });
}
