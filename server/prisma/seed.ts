import { PrismaClient, TaskPriority, TaskStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const admin = await prisma.user.create({
    data: { name: "Resha Admin", email: "admin@agency.test", passwordHash, role: "ADMIN" },
  });
  const ava = await prisma.user.create({
    data: { name: "Ava Patel", email: "pm.ava@agency.test", passwordHash, role: "PROJECT_MANAGER" },
  });
  const leo = await prisma.user.create({
    data: { name: "Leo Hart", email: "pm.leo@agency.test", passwordHash, role: "PROJECT_MANAGER" },
  });
  const maya = await prisma.user.create({
    data: { name: "Maya Chen", email: "dev.maya@agency.test", passwordHash, role: "DEVELOPER" },
  });
  const noah = await prisma.user.create({
    data: { name: "Noah Brooks", email: "dev.noah@agency.test", passwordHash, role: "DEVELOPER" },
  });
  const iris = await prisma.user.create({
    data: { name: "Iris Cole", email: "dev.iris@agency.test", passwordHash, role: "DEVELOPER" },
  });

  const northwind = await prisma.client.create({
    data: {
      name: "Priya Shah",
      company: "Northwind Retail",
      email: "priya@northwind.test",
      phone: "+1 415 555 0142",
      notes: "Quarterly campaign retainer. Prefers weekly status on Mondays.",
      createdById: ava.id,
    },
  });
  const lumen = await prisma.client.create({
    data: {
      name: "Jonah Reed",
      company: "Lumen Health",
      email: "jonah@lumen.test",
      phone: "+1 212 555 0198",
      notes: "HIPAA-aware delivery. All staging behind VPN.",
      createdById: ava.id,
    },
  });
  const harbor = await prisma.client.create({
    data: {
      name: "Sofia Alvarez",
      company: "Harbor Logistics",
      email: "sofia@harbor.test",
      notes: "Tracking portal redesign, go-live in six weeks.",
      createdById: leo.id,
    },
  });

  const shopfront = await prisma.project.create({
    data: {
      name: "Shopfront Refresh",
      description: "Rebuild the Northwind storefront with a faster checkout and campaign landing pages.",
      status: "ACTIVE",
      clientId: northwind.id,
      createdById: ava.id,
    },
  });
  const portal = await prisma.project.create({
    data: {
      name: "Patient Portal v2",
      description: "New appointment booking, records timeline, and clinician messaging.",
      status: "ACTIVE",
      clientId: lumen.id,
      createdById: ava.id,
    },
  });
  const tracking = await prisma.project.create({
    data: {
      name: "Shipment Tracking UX",
      description: "Map-based tracking, exception alerts, and customer-facing ETA accuracy.",
      status: "ACTIVE",
      clientId: harbor.id,
      createdById: leo.id,
    },
  });

  const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  const tasks: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date;
    projectId: string;
    assigneeId: string;
  }[] = [
    {
      title: "Checkout performance budget",
      description: "Cap LCP under 2.5s on the new checkout route and document remaining third-party scripts.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: days(2),
      projectId: shopfront.id,
      assigneeId: maya.id,
    },
    {
      title: "Campaign landing CMS model",
      description: "Content types for seasonal campaigns, hero variants, and legal footnotes.",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: days(5),
      projectId: shopfront.id,
      assigneeId: noah.id,
    },
    {
      title: "Accessibility pass on product grid",
      description: "Keyboard nav, focus rings, and color contrast on filters.",
      status: "IN_REVIEW",
      priority: "HIGH",
      dueDate: days(-1),
      projectId: shopfront.id,
      assigneeId: iris.id,
    },
    {
      title: "Appointment slot engine",
      description: "Rules for clinician availability, buffers, and timezone-safe booking.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      dueDate: days(1),
      projectId: portal.id,
      assigneeId: maya.id,
    },
    {
      title: "Records timeline API",
      description: "Paginated visit history with attachments metadata.",
      status: "TODO",
      priority: "HIGH",
      dueDate: days(8),
      projectId: portal.id,
      assigneeId: noah.id,
    },
    {
      title: "Clinician message encryption notes",
      description: "Document at-rest and in-transit encryption for the messaging thread.",
      status: "DONE",
      priority: "MEDIUM",
      dueDate: days(-4),
      projectId: portal.id,
      assigneeId: iris.id,
    },
    {
      title: "Map tile theming",
      description: "Light/dark map styles aligned with Harbor brand tokens.",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      dueDate: days(3),
      projectId: tracking.id,
      assigneeId: noah.id,
    },
    {
      title: "Exception alert copy",
      description: "SMS and in-app copy for delayed, held, and customs exceptions.",
      status: "TODO",
      priority: "LOW",
      dueDate: days(10),
      projectId: tracking.id,
      assigneeId: iris.id,
    },
    {
      title: "ETA accuracy dashboard",
      description: "Admin view comparing predicted vs actual arrival windows.",
      status: "TODO",
      priority: "URGENT",
      dueDate: days(-3),
      projectId: tracking.id,
      assigneeId: maya.id,
    },
  ];

  for (const t of tasks) {
    const created = await prisma.task.create({ data: t });
    await prisma.activity.create({
      data: {
        type: "TASK_CREATED",
        message: `Task "${created.title}" was created`,
        taskId: created.id,
        projectId: created.projectId,
        actorId: created.projectId === tracking.id ? leo.id : ava.id,
        toValue: created.status,
      },
    });
    if (created.status !== "TODO") {
      await prisma.activity.create({
        data: {
          type: "STATUS_CHANGE",
          message: `${created.assigneeId === maya.id ? "Maya Chen" : created.assigneeId === noah.id ? "Noah Brooks" : "Iris Cole"} moved "${created.title}" to ${created.status}`,
          taskId: created.id,
          projectId: created.projectId,
          actorId: created.assigneeId,
          fromValue: "TODO",
          toValue: created.status ?? undefined,
        },
      });
    }
    await prisma.notification.create({
      data: {
        type: "TASK_ASSIGNED",
        title: "Task assigned to you",
        body: `You were assigned "${created.title}"`,
        userId: t.assigneeId,
        taskId: created.id,
        read: created.status === "DONE",
      },
    });
  }

  console.log("Seed complete.");
  console.log("Accounts (password: Password123!):");
  console.log("  admin@agency.test (ADMIN)");
  console.log("  pm.ava@agency.test (PROJECT_MANAGER)");
  console.log("  pm.leo@agency.test (PROJECT_MANAGER)");
  console.log("  dev.maya@agency.test (DEVELOPER)");
  console.log("  dev.noah@agency.test (DEVELOPER)");
  console.log("  dev.iris@agency.test (DEVELOPER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
