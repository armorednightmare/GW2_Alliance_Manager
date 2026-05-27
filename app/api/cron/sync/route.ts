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
    const { db } = await import("@/lib/firebase-admin");
    const settingsDoc = await db.collection("settings").doc("system").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    // Check Sync Interval
    const apiSyncInterval = settings?.apiSyncInterval || 10;
    const lastSyncDate = settings?.lastSync?.toDate ? settings.lastSync.toDate() : null;
    let shouldSync = true;

    if (lastSyncDate) {
      const minutesSinceLastSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60);
      // We use a small buffer (0.5 mins) to account for slight cron timing variations
      if (minutesSinceLastSync < (apiSyncInterval - 0.5)) {
        shouldSync = false;
      }
    }

    let logs: string[] = [];
    if (shouldSync) {
      logs = await syncAllGuildRosters();
      await db.collection("settings").doc("system").set({ lastSync: new Date() }, { merge: true });
    }


    return NextResponse.json({ 
      success: true, 
      syncRan: shouldSync,
      changes: logs.length, 

      logs 
    });
  } catch(e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
