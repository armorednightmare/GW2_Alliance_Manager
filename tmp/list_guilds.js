const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGuilds() {
  const guilds = await prisma.guild.findMany();
  console.log("--- GUILDS ---");
  for (const g of guilds) {
    console.log(`ID: ${g.id} | Name: ${g.name} | Tag: ${g.tag} | Alliance: ${g.isAllianceGuild}`);
  }
}

checkGuilds();
