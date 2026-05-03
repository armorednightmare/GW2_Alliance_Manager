const admin = require("firebase-admin");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
admin.initializeApp({ projectId: "gw2-alliance-manager" });

async function check() {
  const snapshot = await admin.firestore().collectionGroup("history").limit(5).get();
  console.log(`Found ${snapshot.size} history entries.`);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}
check().catch(console.error);
