import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { recordActivity } from "../services/activityService.js";
import { createNotification } from "../services/notificationService.js";

export function startOverdueJob() {
  cron.schedule("0 * * * *", () => {
    detectOverdueTasks().catch((err) => console.error("Overdue job failed", err));
  });
}

export async function detectOverdueTasks() {
  const now = new Date();
  const overdue = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { notIn: ["DONE"] },
      OR: [{ lastOverdueNotifiedAt: null }, { lastOverdueNotifiedAt: { lt: prismaDateHoursAgo(24) } }],
    },
    include: {
      project: { select: { id: true, name: true, createdById: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  for (const task of overdue) {
    await recordActivity({
      type: "TASK_OVERDUE",
      message: `Task "${task.title}" is overdue`,
      taskId: task.id,
      projectId: task.projectId,
      actorId: null,
      toValue: task.dueDate.toISOString(),
    });

    const recipients = new Set<string>();
    recipients.add(task.project.createdById);
    if (task.assigneeId) recipients.add(task.assigneeId);

    for (const userId of recipients) {
      await createNotification({
        userId,
        type: "TASK_OVERDUE",
        title: "Task overdue",
        body: `"${task.title}" in ${task.project.name} is past its due date`,
        taskId: task.id,
      });
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { lastOverdueNotifiedAt: now },
    });
  }

  return overdue.length;
}

function prismaDateHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}
