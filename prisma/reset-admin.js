const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = "admin@admin.com";
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: "admin123", role: "ADMIN" },
    create: {
      email,
      name: "Admin",
      passwordHash: "admin123",
      role: "ADMIN"
    }
  });
  console.log(`✓ Admin set to: ${email} / admin123`);
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
