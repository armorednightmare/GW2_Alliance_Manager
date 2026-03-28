const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Promote the first user (or by email) to ADMIN
  const email = process.argv[2];

  if (!email) {
    const users = await prisma.user.findMany();
    console.log("Usage: node prisma/make-admin.js <email>");
    console.log("\nAvailable users:");
    users.forEach(u => console.log(`  ${u.email} [${u.role}]`));
    return;
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' }
  });
  console.log(`✓ ${user.email} is now ADMIN`);
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
