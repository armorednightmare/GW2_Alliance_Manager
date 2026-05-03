const admin = require("firebase-admin");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
admin.initializeApp({ projectId: "gw2-alliance-manager" });

async function check() {
  const snapshot = await admin.firestore().collection("members").limit(1).get();
  if (snapshot.empty) {
    console.log("No members found.");
    return;
  }
  const doc = snapshot.docs[0];
  console.log("Member ID:", doc.id);
  console.log("Data:", JSON.stringify(doc.data(), null, 2));
}
check().catch(console.error);
