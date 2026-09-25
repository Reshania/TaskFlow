import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { initSocket } from "./sockets/index.js";
import { startOverdueJob, detectOverdueTasks } from "./jobs/overdueTasks.js";

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);
  startOverdueJob();
  detectOverdueTasks().catch((err) => console.error("Initial overdue scan failed", err));

  server.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
