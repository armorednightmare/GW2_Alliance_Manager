import * as fs from "fs";
import * as path from "path";

const rw = JSON.parse(fs.readFileSync(path.join(__dirname, "../railway_mismatches.json"), "utf-8"));
const fb = JSON.parse(fs.readFileSync(path.join(__dirname, "../firebase_mismatches.json"), "utf-8"));

let md = "# Konkreter Handlungsbedarf für Firebase\n\nHier ist exakt aufgelistet, welche Datenstrukturen in Firebase *geändert oder hinzugefügt* werden müssen, damit sie dem Stand von Railway (PostgreSQL) entsprechen.\n\n";

for (const acc in rw) {
  if (!rw[acc]) continue;
  
  const rwMem = rw[acc].memberData;
  const rwHist = rw[acc].history;
  const fbData = fb[acc];
  
  md += `### ${acc}\n`;
  
  if (!fbData) {
    md += `- **Status:** Fehlt komplett in Firebase.\n`;
    md += `- **Aktion:** Muss als neues Mitglied in Firebase importiert werden.\n`;
    md += `- **Zusätzlich:** ${rwHist.length} Historien-Einträge müssen ebenfalls mit angelegt werden.\n\n`;
    continue;
  }
  
  const fbMem = fbData.memberData;
  const fbHist = fbData.history;
  
  let updates = [];
  
  // Kommentar check
  const rwComment = rwMem.comment || "";
  const fbComment = fbMem.comment === "undefined" || !fbMem.comment ? "" : fbMem.comment;
  
  if (rwComment !== fbComment) {
    updates.push(`**Kommentar aktualisieren:** Muss auf \`"${rwComment}"\` gesetzt werden.`);
  }

  // Historie check
  const missingHist = [];
  for (const rh of rwHist) {
    // Simple Matcher: Gleicher Typ und gleicher neuer Wert
    const match = fbHist.find((fh: any) => 
      fh.eventType === rh.eventType && 
      (fh.newValue || "") === (rh.newValue || "")
    );
    if (!match) {
      const date = new Date(rh.createdAt).toISOString().split('T')[0];
      missingHist.push(`\`[${date}] ${rh.eventType}\`: ${rh.oldValue ? rh.oldValue + ' ➔ ' : ''}${rh.newValue || "N/A"}`);
    }
  }
  
  if (missingHist.length > 0) {
    updates.push(`**Fehlende Historien-Einträge in Firebase ergänzen (${missingHist.length} Stück):**\n  - ${missingHist.join("\n  - ")}`);
  }
  
  if (updates.length === 0) {
    md += `- *Daten (Kommentare & Historie) sind identisch. Hier muss nur die ID in Firebase aktualisiert werden, falls gewünscht.*\n\n`;
  } else {
    updates.forEach(u => md += `- ${u}\n`);
    md += "\n";
  }
}

fs.writeFileSync(path.join(__dirname, "../action_plan.md"), md);
console.log("action_plan.md geschrieben!");
