import type { Activity, ActivityType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { emitActivity } from "../sockets/index.js";

export type ActivityPayload = Activity & {
  actor: { id: string; name: string; role: string } | null;
  task: { id: string; title: string } | null;
  project: { id: string; name: string };
};

const include = {
  actor: { select: { id: true, name: true, role: true } },
  task: { select: { id: true, title: true } },
  project: { select: { id: true, name: true } },
} satisfies Prisma.ActivityInclude;

export async function recordActivity(input: {
  type: ActivityType;
  message: string;
  fromValue?: string | null;
  toValue?: string | null;
  taskId?: string | null;
  projectId: string;
  actorId?: string | null;
}) {
  const activity = await prisma.activity.create({
    data: {
      type: input.type,
      message: input.message,
      fromValue: input.fromValue ?? null,
      toValue: input.toValue ?? null,
      taskId: input.taskId ?? null,
      projectId: input.projectId,
      actorId: input.actorId ?? null,
    },
    include,
  });

  const recipients = await resolveActivityRecipients(activity.projectId, activity.taskId);
  emitActivity(activity, recipients);
  return activity;
}

export async function resolveActivityRecipients(projectId: string, taskId: string | null) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdById: true },
  });
  const ids = new Set<string>();
  if (project) ids.add(project.createdById);
  if (taskId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { assigneeId: true },
    });
    if (task?.assigneeId) ids.add(task.assigneeId);
  }
  return [...ids];
}

export function activityFeedWhere(user: { id: string; role: string }): Prisma.ActivityWhereInput {
  if (user.role === "ADMIN") return {};
  if (user.role === "PROJECT_MANAGER") {
    return { project: { createdById: user.id } };
  }
  return { task: { assigneeId: user.id } };
}

export async function getRecentActivity(user: { id: string; role: string }, limit = 20) {
  return prisma.activity.findMany({
    where: activityFeedWhere(user),
    include,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
