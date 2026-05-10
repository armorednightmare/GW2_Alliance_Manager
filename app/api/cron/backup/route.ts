import { NextResponse } from "next/server";
import { runDatabaseBackup } from "@/lib/backup";

export const dynamic = 'force-dynamic';

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
    } catch (e: any) {
      console.error("Auth Error:", e.message);
      return NextResponse.json({ success: false, error: "Unauthorized", details: e.message }, { status: 401 });
    }
  }

  try {
    await runDatabaseBackup();
    return NextResponse.json({ success: true, message: "Backup successfully triggered and uploaded to Google Drive." });
  } catch(e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
