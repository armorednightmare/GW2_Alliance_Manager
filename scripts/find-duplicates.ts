import * as admin from "firebase-admin";

if (!admin.apps.length) {
  // WE WANT TO CHECK THE LIVE DB! NO EMULATOR VARS!
  admin.initializeApp({ projectId: "gw2-alliance-manager" });
}

const db = admin.firestore();

async function findDuplicates() {
  console.log("🔍 Suche nach Duplikaten in der Live-Datenbank...");
  const snap = await db.collection("members").where("status", "==", "ACTIVE").where("isAllianceMember", "==", true).get();
  
  console.log(`📊 Gefundene aktive Mitglieder: ${snap.size}`);
  
  const names: Record<string, string[]> = {};
  const joinDates: Record<string, any[]> = {};
  
  snap.docs.forEach(d => {
    const data = d.data();
    
    // Check by Name
    if (!names[data.accountName]) names[data.accountName] = [];
    names[data.accountName].push(d.id);
    
    // Check by Join Date
    if (data.joinedAt) {
      const dateStr = data.joinedAt.toDate().toISOString();
      if (!joinDates[dateStr]) joinDates[dateStr] = [];
      joinDates[dateStr].push({ id: d.id, name: data.accountName });
    }
  });
  
  let found = false;
  for (const [name, ids] of Object.entries(names)) {
    if (ids.length > 1) {
      console.log(`⚠️ EXAKTES NAMENS-DUPLIKAT GEFUNDEN: ${name} (IDs: ${ids.join(", ")})`);
      found = true;
    }
  }
  
  for (const [date, members] of Object.entries(joinDates)) {
    if (members.length > 1) {
        const uniqueNames = Array.from(new Set(members.map(m => m.name)));
        if (uniqueNames.length > 1) {
            console.log(`⚠️ MÖGLICHES UMBENENNUNGS-DUPLIKAT (Gleiches Beitrittsdatum):`);
            console.log(`   Datum: ${date}`);
            members.forEach(m => console.log(`   -> ${m.name} (ID: ${m.id})`));
            found = true;
        }
    }
  }

  if (!found) {
    console.log("✅ Keine offensichtlichen Duplikate gefunden!");
    console.log("Mögliche andere Ursache: Jemand ist aus der Gilde ausgetreten, aber das Skript hat ihn nicht auf INACTIVE gesetzt (z.B. weil guildIds fehlt).");
    
    // Check for ghost members
    const allActive = snap.docs.map(d => ({ id: d.id, name: d.data().accountName, guildIds: d.data().guildIds }));
    const ghosts = allActive.filter(m => !m.guildIds || m.guildIds.length === 0);
    if (ghosts.length > 0) {
        console.log(`👻 GHOST MEMBERS GEFUNDEN (Aktiv, aber in keiner Gilde):`);
        ghosts.forEach(g => console.log(`   -> ${g.name} (ID: ${g.id})`));
    }
  }
}

findDuplicates().catch(console.error);
