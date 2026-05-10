import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// 1. Verbindung zur LOKALEN Datenbank (Docker Emulator)
if (!admin.apps.length) {
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
  admin.initializeApp({ projectId: "gw2-alliance-manager" });
}
const localDb = admin.firestore();

const backupPath = path.join(process.cwd(), "backup.json");

async function compare() {
  console.log("🔍 Starte Vergleich: Live-Backup vs. Lokale Datenbank...");

  // 2. Live-Daten aus Backup laden
  if (!fs.existsSync(backupPath)) {
    console.error("❌ backup.json nicht gefunden!");
    return;
  }
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
  const liveMembers = (backup.collections.members || []).filter((m: any) => m.status === "ACTIVE" && m.isAllianceMember === true);
  const liveMap = new Map(liveMembers.map((m: any) => [m.accountName.toLowerCase(), m]));

  // 3. Lokale Daten aus Emulator laden
  const localSnap = await localDb.collection("members").where("status", "==", "ACTIVE").where("isAllianceMember", "==", true).get();
  const localMembers = localSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const localMap = new Map(localMembers.map((m: any) => [m.accountName.toLowerCase(), m]));

  console.log(`📊 Live (Backup): ${liveMap.size} Mitglieder`);
  console.log(`📊 Lokal (Neu):  ${localMap.size} Mitglieder`);
  console.log("------------------------------------------");

  // 4. Differenz finden: Wer ist im Live-Backup, aber nicht lokal?
  let diffCount = 0;
  for (const [name, member] of liveMap.entries()) {
    if (!localMap.has(name)) {
      console.log(`⚠️ NUR IM LIVE-SYSTEM: ${member.accountName} (ID: ${member.id})`);
      diffCount++;
    }
  }

  // 5. Umgekehrt: Wer ist lokal neu dazugekommen?
  for (const [name, member] of localMap.entries()) {
    if (!liveMap.has(name)) {
      console.log(`🆕 NEU IM LOKALEN SCAN: ${member.accountName}`);
    }
  }

  if (diffCount === 0) {
    console.log("✅ Keine Mitglieder im Live-System gefunden, die im lokalen Scan fehlen.");
  } else {
    console.log(`\n💡 Ergebnis: Es wurden ${diffCount} Mitglieder gefunden, die im Live-System "zu viel" sind.`);
  }
}

compare().catch(console.error);
