import { NextResponse } from "next/server";
import { syncAllGuildRosters } from "@/lib/gw2api";

export const dynamic = 'force-dynamic';

// This could be called by a Cron Service like Vercel Cron or a raw curl request
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET || "default_cron_secret"}`;
  
  if (authHeader !== expectedToken) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await syncAllGuildRosters();
    return NextResponse.json({ success: true, changes: logs.length, logs });
  } catch(e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
