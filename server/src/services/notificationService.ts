import type { NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { emitNotification } from "../sockets/index.js";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  taskId?: string | null;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      taskId: input.taskId ?? null,
    },
    include: {
      task: { select: { id: true, title: true, projectId: true } },
    },
  });
  emitNotification(input.userId, notification);
  return notification;
}
