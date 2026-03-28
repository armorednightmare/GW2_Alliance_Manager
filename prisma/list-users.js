const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("All users:");
  users.forEach(u => console.log(`  ID: ${u.id} | Email: ${u.email} | Role: ${u.role}`));

  if (users.length === 0) {
    console.log("No users found. Log in first via Google/Discord, then run this again.");
  }
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
