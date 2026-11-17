import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";
import { startReminderScheduler } from "./modules/reminders/reminders.service";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`✂️  API rodando em http://localhost:${env.PORT}`);
});

const reminderTimer = startReminderScheduler();

async function shutdown() {
  clearInterval(reminderTimer);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
