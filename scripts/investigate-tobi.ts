import "dotenv/config";
import { db } from "../lib/firebase-admin";
import { Client } from "pg";

async function investigate() {
  let pgUrl = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL;
  if (pgUrl && pgUrl.startsWith('"') && pgUrl.endsWith('"')) {
    pgUrl = pgUrl.slice(1, -1);
  }

  const pg = new Client({ connectionString: pgUrl });
  await pg.connect();

  try {
    const accName = 'tobi.8916';
    console.log(`\n--- Suche nach ${accName} in RAILWAY ---`);
    const pgRes = await pg.query('SELECT * FROM "Member" WHERE "accountName" = $1', [accName]);
    if (pgRes.rows.length > 0) {
      const p = pgRes.rows[0];
      console.log(`✅ Gefunden! ID: ${p.id}`);
      console.log(`Kommentar in DB: "${p.comment}"`);
      
      const pgHist = await pg.query('SELECT * FROM "MemberHistory" WHERE "memberId" = $1', [p.id]);
      console.log(`Historien-Einträge in Railway: ${pgHist.rows.length}`);
    } else {
      console.log(`❌ Nicht in Railway gefunden.`);
    }

    console.log(`\n--- Suche nach ${accName} in FIREBASE ---`);
    const fbRes = await db.collection("members").where("accountName", "==", accName).get();
    if (!fbRes.empty) {
      const f = fbRes.docs[0];
      console.log(`✅ Gefunden! ID: ${f.id}`);
      console.log(`Kommentar in DB: "${f.data().comment}"`);
      
      const fbHist = await f.ref.collection("history").get();
      console.log(`Historien-Einträge in Firebase: ${fbHist.docs.length}`);
    } else {
      console.log(`❌ Nicht in Firebase gefunden (Exakte Übereinstimmung fehlgeschlagen).`);
      
      // Fallback: Case-Insensitive oder mit Leerzeichen
      console.log(`Sammle alle Firebase Mitglieder für Fallback-Suche...`);
      const allFb = await db.collection("members").get();
      const match = allFb.docs.find(d => d.data().accountName?.toLowerCase() === accName.toLowerCase());
      if (match) {
        console.log(`⚠️ Gefunden durch Case-Insensitive Suche: ${match.data().accountName} (ID: ${match.id})`);
        const fbHistFallback = await match.ref.collection("history").get();
        console.log(`Historien-Einträge in Firebase: ${fbHistFallback.docs.length}`);
      }
    }

  } catch (err) {
    console.error("Fehler:", err);
  } finally {
    await pg.end();
  }
}
investigate();
