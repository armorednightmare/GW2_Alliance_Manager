import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

if (!getApps().length) {
  // Try to use application default credentials or env config
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

async function cleanupDuplicates() {
  console.log("Starting DB cleanup...");
  const membersSnap = await db.collection("members").get();
  let updatedCount = 0;

  for (const doc of membersSnap.docs) {
    const data = doc.data();
    if (!data.guilds) continue;

    const uniqueGuilds = new Map();
    let hasDuplicates = false;

    // Keep the most recent guild membership object per guild id
    for (const g of data.guilds) {
      if (uniqueGuilds.has(g.id)) {
        hasDuplicates = true;
      }
      // Overwrite so we keep the last one (most recent rank/status)
      uniqueGuilds.set(g.id, g);
    }

    const newGuildsArray = Array.from(uniqueGuilds.values());
    const guildIds = newGuildsArray.map(g => g.id);

    // Update if there were duplicates or if guildIds field is missing
    if (hasDuplicates || !data.guildIds) {
      await doc.ref.update({
        guilds: newGuildsArray,
        guildIds: guildIds
      });
      console.log(`Cleaned up member ${data.accountName}`);
      updatedCount++;
    }
  }

  console.log(`Done. Updated ${updatedCount} members.`);
}

cleanupDuplicates().then(() => process.exit(0)).catch(console.error);
