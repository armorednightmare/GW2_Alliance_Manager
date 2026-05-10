import { NextResponse } from "next/server";
import { syncAllGuildRosters } from "@/lib/gw2api";

export const dynamic = 'force-dynamic';

// This could be called by a Cron Service like Vercel Cron or a raw curl request
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ success: false, error: "Missing Authorization header" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1] || authHeader;
  const customSecret = process.env.CRON_SECRET;
  const isSecretMatch = (token === customSecret) || (authHeader === `Bearer ${customSecret}`);

  if (customSecret && isSecretMatch) {
    // Authorized via secret
  } else {
    // Try Google OIDC Verification
    try {
      const { OAuth2Client } = await import("google-auth-library");
      const client = new OAuth2Client();
      const ticket = await client.verifyIdToken({ idToken: token });
      const payload = ticket.getPayload();
      
      if (!payload?.email?.includes("gserviceaccount.com")) {
        throw new Error("Invalid token source");
      }
      
      console.log(`Verified OIDC request from ${payload.email}`);
    } catch (e: any) {
      console.error("Auth Error:", e.message);
      return NextResponse.json({ success: false, error: "Unauthorized", details: e.message }, { status: 401 });
    }
  }

  try {
    const logs = await syncAllGuildRosters();
    const { db } = await import("@/lib/firebase-admin");
    const settingsDoc = await db.collection("settings").doc("system").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    
    // Trigger Backup if due
    let backupTriggered = false;
    const schedule = settings?.backupCronSchedule || "0 3 * * 0";
    if (schedule !== "DISABLED") {
      const lastBackupDate = settings?.lastBackup?.toDate ? settings.lastBackup.toDate() : null;
      let shouldBackup = !lastBackupDate;
      
      if (lastBackupDate) {
        const hoursSinceLast = (Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60);
        if (schedule === "0 3 * * *") shouldBackup = hoursSinceLast >= 23.5; // Daily
        else if (schedule === "0 3 * * 0") shouldBackup = hoursSinceLast >= (7 * 24 - 1); // Weekly
        else if (schedule === "0 3 1 * *") shouldBackup = hoursSinceLast >= (28 * 24 - 1); // Monthly
      }
      
      if (shouldBackup) {
        const { runDatabaseBackup } = await import("@/lib/backup");
        await runDatabaseBackup();
        await db.collection("settings").doc("system").set({ lastBackup: new Date() }, { merge: true });
        backupTriggered = true;
      }
    }

    await db.collection("settings").doc("system").set({ lastSync: new Date() }, { merge: true });
    return NextResponse.json({ success: true, changes: logs.length, backupTriggered, logs });
  } catch(e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
