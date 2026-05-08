const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
admin.initializeApp({ projectId: "gw2-alliance-manager" });

async function setup() {
  const hash = await bcrypt.hash("admin123", 10);
  await admin.firestore().collection("users").add({
    email: "admin@local.test",
    name: "Admin",
    passwordHash: hash,
    role: "ADMIN",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log("Admin user created (password: admin123, bcrypt-hashed).");
}
setup().catch(console.error);
