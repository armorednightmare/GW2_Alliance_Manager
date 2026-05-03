const admin = require("firebase-admin");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
admin.initializeApp({ projectId: "gw2-alliance-manager" });

async function clear() {
  const snapshot = await admin.firestore().collectionGroup("history").get();
  console.log(`Deleting ${snapshot.size} history entries...`);
  const batch = admin.firestore().batch();
  snapshot.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log("Done.");
}
clear().catch(console.error);
