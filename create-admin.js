const admin = require("firebase-admin");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
admin.initializeApp({ projectId: "gw2-alliance-manager" });

async function setup() {
  await admin.firestore().collection("users").add({
    email: "admin@local.test",
    name: "Admin",
    passwordHash: "admin123",
    role: "ADMIN",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log("Admin user created.");
}
setup().catch(console.error);
