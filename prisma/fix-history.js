const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const histories = await prisma.memberHistory.findMany({
    where: { eventType: 'JOINED' }
  });

  let updated = 0;
  for (const h of histories) {
    if (h.newValue && h.newValue.length === 36) { // Looks like a UUID
      const guild = await prisma.guild.findUnique({ where: { id: h.newValue } });
      if (guild) {
        await prisma.memberHistory.update({
          where: { id: h.id },
          data: { newValue: guild.name }
        });
        updated++;
      }
    }
  }
  console.log(`Fixed ${updated} historical JOINED entries.`);
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
