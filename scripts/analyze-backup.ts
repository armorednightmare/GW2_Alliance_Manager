import * as fs from 'fs';

import * as path from 'path';

const backupPath = path.join(process.cwd(), "backup.json");

function analyzeBackup() {
  console.log(`📂 Lese Backup-Datei: ${backupPath}`);
  
  if (!fs.existsSync(backupPath)) {
    console.error("❌ Fehler: Die Datei wurde nicht gefunden. Stelle sicher, dass der Pfad korrekt ist.");
    return;
  }

  const fileContent = fs.readFileSync(backupPath, 'utf8');
  const backup = JSON.parse(fileContent);
  
  const members = backup.collections.members || [];
  const activeMembers = members.filter((m: any) => m.status === "ACTIVE" && m.isAllianceMember === true);
  
  console.log(`📊 Aktive Mitglieder im Backup: ${activeMembers.length}`);
  
  const names: Record<string, string[]> = {};
  const joinDates: Record<string, any[]> = {};
  
  activeMembers.forEach((m: any) => {
    // Check by Name
    if (!names[m.accountName]) names[m.accountName] = [];
    names[m.accountName].push(m.id);
    
    // Check by Join Date
    if (m.joinedAt) {
      if (!joinDates[m.joinedAt]) joinDates[m.joinedAt] = [];
      joinDates[m.joinedAt].push({ id: m.id, name: m.accountName });
    }
  });
  
  const stats = {
    totalActive: activeMembers.length,
    duplicates: 0,
    renames: 0,
    ghosts: 0,
    stale: 0,
    unknown: 0
  };
  
  console.log("\n--- 1. Namens-Duplikate ---");
  for (const [name, ids] of Object.entries(names)) {
    if (ids.length > 1) {
      console.log(`⚠️ DUPLIKAT: ${name} (IDs: ${ids.join(", ")})`);
      stats.duplicates++;
    }
  }
  if (stats.duplicates === 0) console.log("✅ Keine Namens-Duplikate.");
  
  console.log("\n--- 2. Umbenennungs-Verdacht ---");
  for (const [date, mList] of Object.entries(joinDates)) {
    if (mList.length > 1) {
      const uniqueNames = Array.from(new Set(mList.map(m => m.name)));
      if (uniqueNames.length > 1) {
        console.log(`⚠️ Gleiches Datum (${date}): ${uniqueNames.join(" vs ")}`);
        stats.renames++;
      }
    }
  }
  if (stats.renames === 0) console.log("✅ Kein Umbenennungs-Verdacht.");

  console.log("\n--- 3. Inkonsistenzen (Status: ACTIVE) ---");
  const now = new Date();
  const threshold = 24 * 60 * 60 * 1000;

  activeMembers.forEach((m: any) => {
    if (!m.guildIds || m.guildIds.length === 0) {
      console.log(`👻 GHOST: ${m.accountName} (Keine Gilden)`);
      stats.ghosts++;
      return;
    }

    // Check lastSeenAt (directly on member object)
    const lastSeenTime = m.lastSeenAt ? new Date(m.lastSeenAt).getTime() : 0;
    
    if (lastSeenTime === 0) {
      // Wir loggen UNKNOWN nur im Summary, um den Output nicht zu fluten
      stats.unknown++;
    } else if (now.getTime() - lastSeenTime > threshold) {
      const lastSeen = new Date(lastSeenTime).toLocaleString('de-DE');
      console.log(`⏳ STALE: ${m.accountName} (Zuletzt gesehen: ${lastSeen})`);
      stats.stale++;
    }
  });

  // 4. Multi-Guild Members (in-game zählt die Allianz jeden Account nur 1x)
  console.log("\n--- 4. Mitglieder in mehreren Gilden ---");
  let multiGuildCount = 0;
  activeMembers.forEach((m: any) => {
    const guildCount = (m.guildIds || []).length;
    if (guildCount > 1) {
      const guildNames = (m.guilds || []).map((g: any) => `${g.guild?.name || g.name || '?'} [${g.guild?.tag || g.tag || '?'}]`).join(", ");
      console.log(`🔗 ${m.accountName} → ${guildCount} Gilden (${guildNames})`);
      multiGuildCount++;
    }
  });
  if (multiGuildCount === 0) console.log("✅ Alle Mitglieder sind in genau einer Gilde.");
  else console.log(`   ℹ️ ${multiGuildCount} Mitglieder in mehreren Gilden (normal, kein Problem).`);

  // 5. Verdächtige Einträge: Manuell hinzugefügt oder ohne echte Gildenzuordnung
  console.log("\n--- 5. Manuell hinzugefügte / verdächtige Einträge ---");
  let suspiciousCount = 0;
  const guilds = backup.collections.guilds || [];
  const allianceGuildIds = guilds.filter((g: any) => g.isAllianceGuild).map((g: any) => g.id);
  
  activeMembers.forEach((m: any) => {
    // Member die NUR in der Allianz-Hauptgilde sind (nicht in Sub-Gilden) könnten manuell angelegt sein
    const memberGuildIds = m.guildIds || [];
    const isOnlyInAllianceGuild = memberGuildIds.length === 1 && allianceGuildIds.includes(memberGuildIds[0]);
    
    if (isOnlyInAllianceGuild) {
      console.log(`🔍 NUR-ALLIANZ: ${m.accountName} (ID: ${m.id}) - Ist nur in der Hauptgilde, nicht in einer Sub-Gilde.`);
      suspiciousCount++;
    }
    
    // Member ohne joinedAt (könnten manuell angelegt worden sein)
    if (!m.joinedAt) {
      console.log(`🔍 KEIN BEITRITTSDATUM: ${m.accountName} (ID: ${m.id})`);
      suspiciousCount++;
    }
  });
  if (suspiciousCount === 0) console.log("✅ Keine verdächtigen Einträge.");

  console.log("\n==========================================");
  console.log("📊 ZUSAMMENFASSUNG");
  console.log("==========================================");
  console.log(`Gesamt Aktive Mitglieder: ${stats.totalActive}`);
  console.log(`Namens-Duplikate:         ${stats.duplicates}`);
  console.log(`Umbenennungs-Verdacht:    ${stats.renames}`);
  console.log(`Geist-Einträge (Ghosts):  ${stats.ghosts}`);
  console.log(`Veraltet (Stale >24h):    ${stats.stale}`);
  console.log(`Unbekannt (Kein Datum):   ${stats.unknown}`);
  console.log(`Multi-Gilden-Mitglieder:  ${multiGuildCount}`);
  console.log(`Verdächtige Einträge:     ${suspiciousCount}`);
  console.log("==========================================");
  
  if (stats.duplicates > 0 || stats.ghosts > 0 || stats.renames > 0) {
    console.log("\n💡 EMPFEHLUNG: Du solltest die Ghosts und Duplikate manuell in Firebase löschen.");
  }
}

analyzeBackup();
