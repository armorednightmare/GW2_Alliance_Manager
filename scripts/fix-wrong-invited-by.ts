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

interface GW2LogEntry {
  id: number;
  time: string;
  type: string;
  user?: string;
  invited_by?: string;
}

async function fixWrongInvitedBy() {
  console.log("==================================================");
  console.log(`🔍 Starte Überprüfung alter 'invitedBy'-Einträge (${isDryRun ? "DRY RUN" : "LIVE MODE"})`);
  console.log("==================================================");

  // 1. Lade alle Gilden aus der Datenbank
  const guildsSnapshot = await db.collection("guilds").get();
  const allGuilds = guildsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

  const allianceInviterMap = new Map<string, string>(); // accountName -> alliance inviter
  const subGuildInviterMap = new Map<string, Set<string>>(); // accountName -> Set of sub-guild inviters

  // 2. Rufe die Logs von GW2 für jede Gilde ab
  for (const guild of allGuilds) {
    if (!guild.leaderToken) {
      console.log(`⚠️ Keine API-Token für Gilde '${guild.name}' [${guild.tag}] vorhanden. Überspringe log-check.`);
      continue;
    }

    console.log(`📥 Lade Logs für Gilde '${guild.name}' [${guild.tag}] (Allianzgilde: ${!!guild.isAllianceGuild})...`);
    try {
      const logsRes = await fetch(`https://api.guildwars2.com/v2/guild/${guild.id}/log?access_token=${guild.leaderToken}`);
      if (!logsRes.ok) {
        console.error(`❌ Fehler beim Laden der Logs für ${guild.name}: ${logsRes.statusText}`);
        continue;
      }

      const logs: GW2LogEntry[] = await logsRes.json();
      logs.reverse().forEach(entry => {
        if (entry.type === "invited" && entry.user && entry.invited_by) {
          if (guild.isAllianceGuild) {
            allianceInviterMap.set(entry.user, entry.invited_by);
          } else {
            if (!subGuildInviterMap.has(entry.user)) {
              subGuildInviterMap.set(entry.user, new Set());
            }
            subGuildInviterMap.get(entry.user)!.add(entry.invited_by);
          }
        }
      });
    } catch (err) {
      console.error(`❌ Fehler beim Abrufen der Logs für ${guild.name}:`, err);
    }
  }

  console.log(`\nFound ${allianceInviterMap.size} invite entries in alliance guilds.`);
  console.log(`Found ${subGuildInviterMap.size} invite entries in sub-guilds.\n`);

  // 3. Durchsuche die Mitglieder in der Firestore DB
  const membersSnap = await db.collection("members").get();
  let fixCount = 0;
  let keepCount = 0;

  for (const memberDoc of membersSnap.docs) {
    const member = memberDoc.data();
    const accountName = member.accountName;
    const currentInvitedBy = member.invitedBy;

    if (!currentInvitedBy) continue;

    const allianceInviter = allianceInviterMap.get(accountName);
    const subGuildInviters = subGuildInviterMap.get(accountName);

    let newInvitedBy: string | null = currentInvitedBy;
    let reason = "";

    if (allianceInviter) {
      // Es gibt eine belegbare Allianz-Einladung im Log
      if (currentInvitedBy !== allianceInviter) {
        newInvitedBy = allianceInviter;
        reason = `Falscher Werber im System (${currentInvitedBy}) -> Allianz-Log lautet (${allianceInviter})`;
      }
    } else if (subGuildInviters && subGuildInviters.has(currentInvitedBy)) {
      // Werber stammte nachweislich aus einem Subgilden-Log
      newInvitedBy = null;
      reason = `Werber '${currentInvitedBy}' stammte fälschlicherweise aus Subgilden-Sync (nicht Allianzgilde)`;
    } else if (!member.isAllianceMember) {
      // Mitglied ist überhaupt nicht in der Allianzgilde
      newInvitedBy = null;
      reason = `Mitglied ist kein Allianzmitglied, aber hatte Werber '${currentInvitedBy}' aus Subgilde`;
    }

    if (newInvitedBy !== currentInvitedBy) {
      fixCount++;
      const prefix = isDryRun ? "[DRY-RUN] Würde korrigieren" : "Korrigiere";
      console.log(`⚠️ ${prefix} | ${accountName}: ${reason}`);

      if (!isDryRun) {
        await memberDoc.ref.update({
          invitedBy: newInvitedBy
        });
      }
    } else {
      keepCount++;
    }
  }

  console.log("\n==================================================");
  console.log(`🏁 Überprüfung abgeschlossen.`);
  console.log(`- ${fixCount} fehlerhafte 'invitedBy'-Einträge ${isDryRun ? "würden korrigiert" : "wurden korrigiert"}.`);
  console.log(`- ${keepCount} korrekte/unveränderte 'invitedBy'-Einträge beibehalten.`);
  if (isDryRun) {
    console.log(`\n💡 Tipp: Starte ohne '--dry-run', um die Korrekturen in Firestore zu speichern.`);
  }
  console.log("==================================================");
}

fixWrongInvitedBy().then(() => process.exit(0)).catch(console.error);
