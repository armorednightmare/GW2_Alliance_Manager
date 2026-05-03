import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";

export const scheduledRosterSync = onSchedule("every 60 minutes", async (event) => {
  logger.info("Starting scheduled roster sync");
  
  const APP_URL = process.env.APP_URL || "https://dein-app-hosting-url.com";
  const CRON_SECRET = process.env.CRON_SECRET || "default_cron_secret";
  
  try {
    // Call the Next.js API route that does the actual syncing
    const res = await fetch(`${APP_URL}/api/cron/sync`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${CRON_SECRET}`
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error(`Sync API returned ${res.status}: ${errorText}`);
      throw new Error(`Sync API returned ${res.status}`);
    }
    
    const data = await res.json();
    logger.info(`Sync finished successfully: ${data.changes} changes recorded.`);
  } catch (error) {
    logger.error("Error during scheduled roster sync", error);
  }
});
