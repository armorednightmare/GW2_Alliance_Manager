import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET || "default_cron_secret"}`;
  
  // Quick auth check (you can trigger this manually with the secret)
  if (authHeader !== expectedToken) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const membersSnap = await db.collection("members").get();
    let updatedCount = 0;

    for (const doc of membersSnap.docs) {
      const data = doc.data();
      if (!data.guilds) continue;

      const uniqueGuilds = new Map();
      let hasDuplicates = false;

      for (const g of data.guilds) {
        if (uniqueGuilds.has(g.id)) {
          hasDuplicates = true;
        }
        uniqueGuilds.set(g.id, g);
      }

      const newGuildsArray = Array.from(uniqueGuilds.values());
      const guildIds = newGuildsArray.map(g => g.id);

      if (hasDuplicates || !data.guildIds) {
        await doc.ref.update({
          guilds: newGuildsArray,
          guildIds: guildIds
        });
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, message: `Cleaned up ${updatedCount} members.` });
  } catch(e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
