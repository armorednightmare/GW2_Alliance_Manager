import "dotenv/config";
import { db } from "../lib/firebase-admin";
import { Client } from "pg";

async function compareDatabases() {
  let pgUrl = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL;
  if (pgUrl && pgUrl.startsWith('"') && pgUrl.endsWith('"')) {
    pgUrl = pgUrl.slice(1, -1);
  }
  
  if (!pgUrl) {
    console.error("❌ Keine DATABASE_URL gefunden.");
    process.exit(1);
  }

  console.log("🔗 Verbinde mit PostgreSQL (Railway)...");
  const pg = new Client({ connectionString: pgUrl });
  await pg.connect();

  try {
    console.log("========================================");
    console.log("🔍 Starte Vergleich: Railway vs Firebase");
    console.log("========================================\n");

    // --- 1. Gilden vergleichen ---
    console.log("🏰 Vergleiche Gilden...");
    const pgGuildsRes = await pg.query('SELECT id, name FROM "Guild"');
    const fbGuildsSnap = await db.collection("guilds").get();
    
    const pgGuildIds = new Set(pgGuildsRes.rows.map(g => g.id));
    const fbGuildIds = new Set(fbGuildsSnap.docs.map(d => d.id));

    console.log(`📊 Railway: ${pgGuildIds.size} Gilden | Firebase: ${fbGuildIds.size} Gilden`);
    
    let missingGuildsFb = 0;
    for (const g of pgGuildsRes.rows) {
      if (!fbGuildIds.has(g.id)) {
        console.log(`⚠️ Gilde in Firebase fehlend: ${g.name} (${g.id})`);
        missingGuildsFb++;
      }
    }
    if (missingGuildsFb === 0) console.log("✅ Alle Railway-Gilden sind in Firebase vorhanden.");


    // --- 2. Mitglieder vergleichen ---
    console.log("\n👤 Vergleiche Mitglieder...");
    const pgMembersRes = await pg.query('SELECT id, "accountName" FROM "Member"');
    const fbMembersSnap = await db.collection("members").get();

    const pgMemberIds = new Set(pgMembersRes.rows.map(m => m.id));
    const fbMemberIds = new Set(fbMembersSnap.docs.map(d => d.id));

    console.log(`📊 Railway: ${pgMemberIds.size} Mitglieder | Firebase: ${fbMemberIds.size} Mitglieder`);

    let missingMembersFb = 0;
    for (const m of pgMembersRes.rows) {
      if (!fbMemberIds.has(m.id)) {
        console.log(`⚠️ Mitglied in Firebase fehlend: ${m.accountName} (${m.id})`);
        missingMembersFb++;
      }
    }
    if (missingMembersFb === 0) console.log("✅ Alle Railway-Mitglieder sind in Firebase vorhanden.");


    // --- 3. Benutzer vergleichen ---
    console.log("\n🔑 Vergleiche Benutzer...");
    const pgUsersRes = await pg.query('SELECT id, name, email FROM "User"');
    const fbUsersSnap = await db.collection("users").get();

    const pgUserIds = new Set(pgUsersRes.rows.map(u => u.id));
    const fbUserIds = new Set(fbUsersSnap.docs.map(d => d.id));

    console.log(`📊 Railway: ${pgUserIds.size} Benutzer | Firebase: ${fbUserIds.size} Benutzer`);

    let missingUsersFb = 0;
    for (const u of pgUsersRes.rows) {
      if (!fbUserIds.has(u.id)) {
        console.log(`⚠️ Benutzer in Firebase fehlend: ${u.name || u.email} (${u.id})`);
        missingUsersFb++;
      }
    }
    if (missingUsersFb === 0) console.log("✅ Alle Railway-Benutzer sind in Firebase vorhanden.");

    console.log("\n✅ VERGLEICH ABGESCHLOSSEN!");

  } catch (error) {
    console.error("❌ Fehler beim Vergleich:", error);
  } finally {
    await pg.end();
  }
}

compareDatabases();
