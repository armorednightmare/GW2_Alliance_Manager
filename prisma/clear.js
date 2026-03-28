const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDb() {
  console.log("Clearing database...");
  await prisma.memberHistory.deleteMany();
  console.log("✓ MemberHistory cleared");
  await prisma.user.deleteMany();
  console.log("✓ Users cleared");
  await prisma.member.deleteMany();
  console.log("✓ Members cleared");
  await prisma.guild.deleteMany();
  console.log("✓ Guilds cleared");
  await prisma.systemSettings.deleteMany();
  console.log("✓ SystemSettings cleared");
  console.log("\nDatabase is empty and ready for real GW2 API data!");
  await prisma.$disconnect();
}

clearDb().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
