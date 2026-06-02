import "dotenv/config";
import { db } from "../lib/firebase-admin";
import { Client } from "pg";

const targets = [
  "noxx.4751", "CuChullaInn.5468", "Dagobert.5801", "Crom.3295", 
  "Sapherion.1642", "Astralwache.5249", "Chookie.4602", 
  "Gandalf v Offstein.7809", "tobi.8916", "Marhem.8130", 
  "Vhang Raisu.3264", "Anthuriel Septis.2876", "Crom.9174", 
  "DisasterCuBeZz.9173", "Teifir.1928"
];

async function investigateAll() {
  let pgUrl = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL;
  if (pgUrl && pgUrl.startsWith('"') && pgUrl.endsWith('"')) {
    pgUrl = pgUrl.slice(1, -1);
  }

  const pg = new Client({ connectionString: pgUrl });
  await pg.connect();

  try {
    const results: any[] = [];

    // Pre-fetch all firebase members to allow case-insensitive search easily
    const allFbSnap = await db.collection("members").get();
    const fbMembers = allFbSnap.docs.map(d => ({ id: d.id, data: d.data(), ref: d.ref }));

    for (const acc of targets) {
      const pgRes = await pg.query('SELECT * FROM "Member" WHERE LOWER("accountName") = $1', [acc.toLowerCase()]);
      
      let rwData = { id: "-", comment: "-", hist: 0 };
      if (pgRes.rows.length > 0) {
        const p = pgRes.rows[0];
        const pgHist = await pg.query('SELECT count(*) FROM "MemberHistory" WHERE "memberId" = $1', [p.id]);
        rwData = { 
          id: p.id, 
          comment: p.comment || "", 
          hist: parseInt(pgHist.rows[0].count, 10) 
        };
      }

      const fbMatches = fbMembers.filter(m => m.data.accountName?.toLowerCase() === acc.toLowerCase());
      let fbData = { id: "-", comment: "-", hist: 0 };
      if (fbMatches.length > 0) {
        const f = fbMatches[0];
        const fbHistSnap = await f.ref.collection("history").get();
        fbData = {
          id: f.id,
          comment: f.data.comment === undefined ? "undefined" : (f.data.comment || ""),
          hist: fbHistSnap.size
        };
      }

      results.push({
        account: acc,
        rwId: rwData.id,
        fbId: fbData.id,
        rwComment: rwData.comment,
        fbComment: fbData.comment,
        rwHist: rwData.hist,
        fbHist: fbData.hist
      });
    }

    console.log(JSON.stringify(results, null, 2));

  } catch(e) {
    console.error(e);
  } finally {
    await pg.end();
  }
}
investigateAll();
