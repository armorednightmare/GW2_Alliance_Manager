import { prisma } from "./lib/prisma";
import { syncAllGuildRosters } from "./lib/gw2api";
import { runDatabaseBackup } from "./lib/backup";
import cron, { ScheduledTask } from "node-cron";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Dynamic Backup Cron Logic
let currentBackupSchedule: string = '0 3 * * 0'; // default
let currentBackupCronTask: ScheduledTask | null = null;

function applyBackupSchedule(schedule: string) {
  if (currentBackupCronTask) {
    currentBackupCronTask.stop();
    currentBackupCronTask = null;
  }
  
  if (schedule === "DISABLED") {
    console.log("⏸️ Automatisierte Backups sind deaktiviert.");
    return;
  }

  // Basic validation to prevent crashing
  if (!cron.validate(schedule)) {
    console.error("❌ Ungültiger Cron-Ausdruck:", schedule);
    return;
  }

  currentBackupCronTask = cron.schedule(schedule, async () => {
    console.log("⏰ Cron Trigger: Scheduled Database Backup");
    try {
      await runDatabaseBackup();
    } catch (e: any) {
      console.error("❌ Uncaught exception in Database Backup job:", e);
    }
  });
  console.log(`⏱️ Backup-Zeitplan aktualisiert auf: "${schedule}"`);
}

async function runCron() {
  console.log("🛠️ Background Auto-Sync Worker started.");

  // Init backup schedule
  try {
    const settings = await prisma.systemSettings.findFirst();
    if (settings?.backupCronSchedule) {
      currentBackupSchedule = settings.backupCronSchedule;
    }
  } catch (e) {
    console.log("DB might not be ready yet for settings");
  }
  
  applyBackupSchedule(currentBackupSchedule);

  while (true) {
    let intervalMinutes = 60; // Default

    try {
      const settings = await prisma.systemSettings.findFirst();
      if (settings?.apiSyncInterval) {
        intervalMinutes = settings.apiSyncInterval;
      }
      if (settings?.backupCronSchedule && settings.backupCronSchedule !== currentBackupSchedule) {
        console.log(`♻️ Neuer Backup-Zeitplan erkannt!`);
        currentBackupSchedule = settings.backupCronSchedule;
        applyBackupSchedule(currentBackupSchedule);
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
