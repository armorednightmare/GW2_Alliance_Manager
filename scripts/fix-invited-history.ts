import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

if (!getApps().length) {
  let certConfig;
  try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
      certConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    }
    initializeApp(certConfig ? { credential: cert(certConfig) } : undefined);
  } catch (e) {
    console.error("Firebase Init Error:", e);
  }
}

const db = getFirestore();
const isDryRun = process.argv.includes("--dry-run") || process.argv.includes("-d");

async function fixInvitedHistory() {
  if (isDryRun) {
    console.log("ℹ️ DRY RUN aktiv - Es werden keine Änderungen in der Datenbank gespeichert.");
  }
  console.log("Starte Korrektur der Einladungs-Historie...");
  const membersSnap = await db.collection("members").get();
  let fixCount = 0;

  for (const memberDoc of membersSnap.docs) {
    const memberData = memberDoc.data();
    if (!memberData.guilds) continue;

    // Find if the member has any guild where their current rank is "Invited"
    const invitedGuilds = memberData.guilds.filter((g: any) => g.rank && g.rank.toLowerCase() === "invited");
    if (invitedGuilds.length === 0) continue;

    const historySnap = await memberDoc.ref.collection("history").get();
    for (const histDoc of historySnap.docs) {
      const histData = histDoc.data();
      
      // If the eventType is JOINED
      if (histData.eventType === "JOINED") {
        // Check if this JOINED event corresponds to one of the currently invited guilds
        for (const guild of invitedGuilds) {
          const matchTag = `[${guild.tag}]`;
          const matchesGuild = (histData.description && histData.description.includes(matchTag)) ||
                                (histData.newValue && histData.newValue.includes(matchTag));
          
          if (matchesGuild) {
            console.log(`${isDryRun ? "[DRY-RUN] Würde korrigieren" : "Korrigiere Historie"} für ${memberData.accountName}: JOINED -> INVITED für Gilde ${guild.name} [${guild.tag}]`);
            
            if (!isDryRun) {
              await histDoc.ref.update({
                eventType: "INVITED",
                description: `In ${guild.name} [${guild.tag}] eingeladen`
              });
            }
            
            fixCount++;
          }
        }
      }
    }
  }

  console.log(`Korrektur beendet. ${isDryRun ? "Simulierte" : "Tatsächliche"} Änderungen: ${fixCount}`);
}

fixInvitedHistory().then(() => process.exit(0)).catch(console.error);
