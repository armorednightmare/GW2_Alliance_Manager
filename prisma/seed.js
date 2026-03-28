const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding mock data...");

  // Clean the database
  await prisma.memberHistory.deleteMany();
  await prisma.member.deleteMany();
  await prisma.guild.deleteMany();
  await prisma.user.deleteMany();

  // Create Guilds
  const g1 = await prisma.guild.create({
    data: { id: "G1-UUID-123", name: "Die Drachenhüter", tag: "DRAG", leaderToken: "fake-token-1" }
  });
  const g2 = await prisma.guild.create({
    data: { id: "G2-UUID-456", name: "WvW Elite", tag: "ELIT", leaderToken: "fake-token-2" }
  });
  const g3 = await prisma.guild.create({
    data: { id: "G3-UUID-789", name: "Feierabend Spieler", tag: "CHIL", leaderToken: null }
  });

  // Create Members
  const membersData = [
    { accountName: "Commander.1234", guildId: g1.id, status: "ACTIVE", rank: "Leader", wvwMember: true, manualRole: "Commander" },
    { accountName: "Scout.5678", guildId: g1.id, status: "ACTIVE", rank: "Officer", wvwMember: true, manualRole: "Scout" },
    { accountName: "Casual.9012", guildId: g1.id, status: "ACTIVE", rank: "Member", wvwMember: false },
    { accountName: "Fighter.3333", guildId: g1.id, status: "ACTIVE", rank: "Veteran", wvwMember: true },
    
    { accountName: "Roamer.4321", guildId: g2.id, status: "ACTIVE", rank: "Veteran", wvwMember: true },
    { accountName: "Zergling.8888", guildId: g2.id, status: "ACTIVE", rank: "Member", wvwMember: true },
    { accountName: "Crafter.8765", guildId: g2.id, status: "INACTIVE_LEFT", rank: "Member", wvwMember: false },

    { accountName: "Sleeper.9999", guildId: g3.id, status: "ACTIVE", rank: "Member", wvwMember: false },
    
    { accountName: "Friend.1111", guildId: null, status: "FRIEND", rank: null, wvwMember: true, manualRole: "Allianz Gast" }
  ];

  const createdMembers = [];
  for (const data of membersData) {
    const member = await prisma.member.create({ data });
    createdMembers.push(member);
  }

  // Create History entries
  await prisma.memberHistory.create({
    data: { memberId: createdMembers[0].id, eventType: "WVW_STATUS_CHANGE", oldValue: "false", newValue: "true" }
  });
  await prisma.memberHistory.create({
    data: { memberId: createdMembers[1].id, eventType: "JOINED", newValue: "DRAG" }
  });
  await prisma.memberHistory.create({
    data: { memberId: createdMembers[6].id, eventType: "LEFT", oldValue: "ELIT" }
  });
  await prisma.memberHistory.create({
    data: { memberId: createdMembers[8].id, eventType: "COMMENT_ADDED", newValue: "Bekannter Roamer, aushilfsweise dabei" }
  });

  // Create Mock Admin User
  await prisma.user.create({
    data: { name: "AdminUser", email: "admin@example.com", role: "ADMIN" }
  });

  console.log("Seeding finished successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
