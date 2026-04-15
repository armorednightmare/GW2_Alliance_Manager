import { prisma } from "./lib/prisma";
import { syncAllGuildRosters } from "./lib/gw2api";
import { runDatabaseBackup } from "./lib/backup";
import cron from "node-cron";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Schedule weekly DB Backup to run every Sunday at 03:00 AM
cron.schedule('0 3 * * 0', async () => {
  console.log("⏰ Cron Trigger: Scheduled Weekly Database Backup");
  try {
    await runDatabaseBackup();
  } catch (e: any) {
    console.error("❌ Uncaught exception in Database Backup job:", e);
  }
});

async function runCron() {
  console.log("🛠️ Background Auto-Sync Worker started.");

  while (true) {
    let intervalMinutes = 60; // Default

    try {
      const settings = await prisma.systemSettings.findFirst();
      if (settings?.apiSyncInterval) {
        intervalMinutes = settings.apiSyncInterval;
      }
    } catch (e: any) {
      console.error("Cron Database lookup failed:", e.message);
    }

    // Convert minutes to milliseconds
    const waitMs = intervalMinutes * 60 * 1000;
    console.log(`⏳ Next sync in ${intervalMinutes} minutes.`);

    // Wait before triggering sync to avoid immediate run on every dev reload
    await sleep(waitMs);

    console.log("🔄 Starting scheduled GW2 roster sync...");
    try {
      const logs = await syncAllGuildRosters();
      console.log(`✅ Sync completed. Changes: ${logs.length}`);
    } catch (e: any) {
      console.error("❌ Sync Error:", e.message);
    }
  }
}

// Ensure Node gracefully exits
process.on('SIGINT', async () => {
  console.log("Cron shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

// Start the loop
runCron();
