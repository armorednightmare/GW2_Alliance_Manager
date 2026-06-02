import "dotenv/config";
import { db } from "../lib/firebase-admin";
import * as fs from "fs";
import * as path from "path";

const isDryRun = process.argv.includes("--dry-run");

async function syncActionPlan() {
  console.log(`\n🚀 Starte Sync-Plan... ${isDryRun ? "[DRY-RUN AKTIV - Keine echten Änderungen]" : "!!! [SCHARF - DATEN WERDEN GEÄNDERT] !!!"}\n`);

  try {
    const rwData = JSON.parse(fs.readFileSync(path.join(__dirname, "../railway_mismatches.json"), "utf-8"));

    // Hilfsfunktion zum Abrufen des Firebase-Docs anhand des accountName
    const getFbDoc = async (accName: string) => {
      const snap = await db.collection("members").where("accountName", "==", accName).get();
      return snap.empty ? null : snap.docs[0];
    };

    // Hilfsfunktion zum Hinzufügen von Historien-Einträgen aus Railway
    const addMissingHistory = async (fbDoc: any, rwHistoryItems: any[], eventTypesToCopy: string[]) => {
      for (const rwH of rwHistoryItems) {
        if (eventTypesToCopy.includes(rwH.eventType)) {
          // Check ob er schon existiert
          const existing = await fbDoc.ref.collection("history").where("eventType", "==", rwH.eventType).where("newValue", "==", rwH.newValue || null).get();
          if (existing.empty) {
            const histObj = {
              eventType: rwH.eventType,
              oldValue: rwH.oldValue,
              newValue: rwH.newValue,
              timestamp: new Date(rwH.createdAt),
              createdAt: new Date(rwH.createdAt),
              guildId: rwH.guildId
            };
            if (isDryRun) {
              console.log(`   [DRY-RUN] Würde Historie hinzufügen zu ${fbDoc.data().accountName}: [${rwH.eventType}] ${rwH.oldValue || ""} -> ${rwH.newValue || ""}`);
            } else {
              await fbDoc.ref.collection("history").doc(rwH.id).set(histObj);
              console.log(`   ✅ Historie hinzugefügt zu ${fbDoc.data().accountName}: [${rwH.eventType}]`);
            }
          }
        }
      }
    };

    // --- 1. noxx.4751 ---
    let doc = await getFbDoc("noxx.4751");
    if (doc && rwData["noxx.4751"]) await addMissingHistory(doc, rwData["noxx.4751"].history, ["RANK_CHANGE"]);

    // --- 2. CuChullaInn.5468 ---
    doc = await getFbDoc("CuChullaInn.5468");
    if (doc && rwData["CuChullaInn.5468"]) await addMissingHistory(doc, rwData["CuChullaInn.5468"].history, ["RANK_CHANGE"]);

    // --- 3. Sapherion.1642 ---
    doc = await getFbDoc("Sapherion.1642");
    if (doc && rwData["Sapherion.1642"]) await addMissingHistory(doc, rwData["Sapherion.1642"].history, ["RANK_CHANGE"]);

    // --- 4. Gandalf v Offstein.7809 ---
    doc = await getFbDoc("Gandalf v Offstein.7809");
    if (doc && rwData["Gandalf v Offstein.7809"]) await addMissingHistory(doc, rwData["Gandalf v Offstein.7809"].history, ["MANUAL_ROLE_CHANGED"]);

    // --- 5. Crom.9174 ---
    doc = await getFbDoc("Crom.9174");
    if (doc && rwData["Crom.9174"]) await addMissingHistory(doc, rwData["Crom.9174"].history, ["MANUAL_ROLE_CHANGED"]);

    // --- 6. tobi.8916 ---
    doc = await getFbDoc("tobi.8916");
    if (doc && rwData["tobi.8916"]) {
      const rwMem = rwData["tobi.8916"].memberData;
      if (isDryRun) {
        console.log(`   [DRY-RUN] Würde Member-Feld 'comment' bei tobi.8916 setzen auf: "${rwMem.comment}"`);
      } else {
        await doc.ref.update({ comment: rwMem.comment });
        console.log(`   ✅ Member-Feld 'comment' bei tobi.8916 aktualisiert.`);
      }
      await addMissingHistory(doc, rwData["tobi.8916"].history, ["MANUAL_ROLE_CHANGED", "COMMENT_CHANGED"]);
    }

    // --- 7. Vhang Raisu.3264 (ehemals Astralwache.5249) ---
    doc = await getFbDoc("Vhang Raisu.3264");
    if (doc && rwData["Astralwache.5249"]) {
      const oldRwMem = rwData["Astralwache.5249"].memberData;
      
      if (isDryRun) {
        console.log(`   [DRY-RUN] Würde Member-Felder bei Vhang Raisu.3264 setzen auf: comment="${oldRwMem.comment}", manualRole="${oldRwMem.manualRole}", customDiscordName="${oldRwMem.customDiscordName}"`);
      } else {
        await doc.ref.update({
          comment: oldRwMem.comment,
          manualRole: oldRwMem.manualRole,
          customDiscordName: oldRwMem.customDiscordName
        });
        console.log(`   ✅ Member-Felder bei Vhang Raisu.3264 aktualisiert.`);
      }

      // Historie von Astralwache nach Vhang Raisu kopieren
      await addMissingHistory(doc, rwData["Astralwache.5249"].history, ["COMMENT_CHANGED", "MANUAL_ROLE_CHANGED", "DISCORD_NAME_CHANGED"]);

      // Den fehlerhaften KICKED Eintrag zu LEFT umwandeln
      const histSnap = await doc.ref.collection("history").where("eventType", "==", "KICKED").get();
      if (!histSnap.empty) {
        const kickedDoc = histSnap.docs[0];
        if (isDryRun) {
          console.log(`   [DRY-RUN] Würde KICKED Historie-Eintrag in LEFT umwandeln bei Vhang Raisu.3264`);
        } else {
          await kickedDoc.ref.update({ eventType: "LEFT" });
          console.log(`   ✅ KICKED in LEFT umgewandelt bei Vhang Raisu.3264`);
        }
      }
    }

    console.log(`\n🏁 Sync-Skript ${isDryRun ? "Dry-Run" : "Scharf"} erfolgreich beendet!\n`);

  } catch (e) {
    console.error("❌ Fehler beim Sync:", e);
  }
}

syncActionPlan();
