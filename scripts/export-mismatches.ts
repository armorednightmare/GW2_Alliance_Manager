import "dotenv/config";
import { db } from "../lib/firebase-admin";
import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

const targets = [
  "noxx.4751", "CuChullaInn.5468", "Dagobert.5801", "Crom.3295", 
  "Sapherion.1642", "Astralwache.5249", "Chookie.4602", 
  "Gandalf v Offstein.7809", "tobi.8916", "Marhem.8130", 
  "Vhang Raisu.3264", "Anthuriel Septis.2876", "Crom.9174", 
  "DisasterCuBeZz.9173", "Teifir.1928"
];

async function exportMismatches() {
  let pgUrl = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL;
  if (pgUrl && pgUrl.startsWith('"') && pgUrl.endsWith('"')) {
    pgUrl = pgUrl.slice(1, -1);
  }

  const pg = new Client({ connectionString: pgUrl });
  await pg.connect();

  const rwExport: Record<string, any> = {};
  const fbExport: Record<string, any> = {};

  try {
    const allFbSnap = await db.collection("members").get();
    const fbMembers = allFbSnap.docs.map(d => ({ id: d.id, data: d.data(), ref: d.ref }));

    for (const acc of targets) {
      // --- RAILWAY ---
      const pgRes = await pg.query('SELECT * FROM "Member" WHERE LOWER("accountName") = $1', [acc.toLowerCase()]);
      if (pgRes.rows.length > 0) {
        const p = pgRes.rows[0];
        const pgHist = await pg.query('SELECT * FROM "MemberHistory" WHERE "memberId" = $1 ORDER BY "createdAt" DESC', [p.id]);
        
        rwExport[acc] = {
          memberData: p,
          history: pgHist.rows
        };
      } else {
        rwExport[acc] = null;
      }

      // --- FIREBASE ---
      const fbMatches = fbMembers.filter(m => m.data.accountName?.toLowerCase() === acc.toLowerCase());
      if (fbMatches.length > 0) {
        const f = fbMatches[0];
        const fbHistSnap = await f.ref.collection("history").orderBy("timestamp", "desc").get();
        fbExport[acc] = {
          id: f.id,
          memberData: f.data,
          history: fbHistSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        };
      } else {
        fbExport[acc] = null;
      }
    }

    fs.writeFileSync(path.join(__dirname, "../railway_mismatches.json"), JSON.stringify(rwExport, null, 2));
    fs.writeFileSync(path.join(__dirname, "../firebase_mismatches.json"), JSON.stringify(fbExport, null, 2));

    console.log("✅ JSON-Dateien erfolgreich erstellt!");

  } catch (e) {
    console.error(e);
  } finally {
    await pg.end();
  }
}
exportMismatches();
