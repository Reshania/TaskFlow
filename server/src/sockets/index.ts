import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../utils/tokens.js";
import type { ActivityPayload } from "../services/activityService.js";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigin,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");
      if (!token) return next(new Error("Authentication required"));
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, name: true },
      });
      if (!user) return next(new Error("User not found"));
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as { id: string; role: string };
    socket.join(`user:${user.id}`);
    if (user.role === "ADMIN") {
      socket.join("admins");
    }
  });

  return io;
}

export function getIo() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function emitActivity(activity: ActivityPayload, recipientUserIds: string[]) {
  const server = getIo();
  server.to("admins").emit("activity:new", activity);
  for (const userId of recipientUserIds) {
    server.to(`user:${userId}`).emit("activity:new", activity);
  }
}

export function emitNotification(userId: string, notification: unknown) {
  getIo().to(`user:${userId}`).emit("notification:new", notification);
}
