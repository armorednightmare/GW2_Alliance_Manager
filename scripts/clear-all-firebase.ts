import * as admin from "firebase-admin";

if (!admin.apps.length) {
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
  admin.initializeApp({ projectId: "gw2-alliance-manager" });
}

const db = admin.firestore();
const auth = admin.auth();

async function deleteDocumentAndSubcollections(docRef: admin.firestore.DocumentReference) {
  const collections = await docRef.listCollections();
  for (const collection of collections) {
    const snapshot = await collection.get();
    for (const doc of snapshot.docs) {
      await deleteDocumentAndSubcollections(doc.ref);
    }
  }
  await docRef.delete();
}

async function clearCollectionDeep(collectionPath: string) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();
  
  console.log(`⏳ Lösche ${snapshot.size} Dokumente aus ${collectionPath}...`);
  
  for (const doc of snapshot.docs) {
    // Speziell für Mitglieder: History löschen
    if (collectionPath === "members") {
        const historySnapshot = await doc.ref.collection("history").get();
        const batch = db.batch();
        historySnapshot.docs.forEach(h => batch.delete(h.ref));
        await batch.commit();
    }
    await doc.ref.delete();
  }
  console.log(`✅ Collection ${collectionPath} ist jetzt absolut leer.`);
}

async function clearAll() {
  console.log("🚀 Starte DEEP CLEAN der Firebase-Daten...");
  
  const collections = ["guilds", "members", "users", "settings", "roles"];
  for (const col of collections) {
    await clearCollectionDeep(col);
  }
  
  const users = await auth.listUsers();
  for (const user of users.users) {
    await auth.deleteUser(user.uid);
  }
  console.log("✅ Alle Auth-Nutzer gelöscht.");
  
  console.log("✨ Firebase ist jetzt klinisch rein.");
}

clearAll().catch(console.error);
