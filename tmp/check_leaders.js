const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLeaders() {
  const leaders = await prisma.user.findMany({
    where: { role: 'GUILD_LEADER' },
    include: { member: true, managedGuild: true }
  });

  console.log("--- GUILD LEADERS ---");
  for (const u of leaders) {
    console.log(`User: ${u.email} (ID: ${u.id})`);
    console.log(`  managedGuildId: ${u.managedGuildId} (${u.managedGuild?.name || 'none'})`);
    if (u.member) {
      console.log(`  Linked Member: ${u.member.accountName}`);
      console.log(`  automated subGuildId: ${u.member.subGuildId}`);
    } else {
      console.log("  No linked member!");
    }
  }
}

checkLeaders();
