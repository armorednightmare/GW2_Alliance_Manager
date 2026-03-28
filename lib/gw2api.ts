import { prisma } from "./prisma";

interface GW2Member {
  name: string; // Account name, e.g., Name.1234
  rank: string;
  joined: string; // ISO date string from GW2 API
  wvw_member: boolean;
}

interface GW2LogEntry {
  id: number;
  time: string;
  type: string;
  user?: string;
  invited_by?: string;
  // Others omitted
}

export async function syncAllGuildRosters() {
  // Sort so Alliance Guilds are processed LAST.
  // This ensures that the primary 'guildId' points to the Alliance Guild for members in both.
  const guilds = await prisma.guild.findMany({
    where: { leaderToken: { not: null } },
    orderBy: { isAllianceGuild: 'asc' } 
  });

  const logs = [];

  for (const guild of guilds) {
    if (!guild.leaderToken) continue;

    try {
      // 1. Fetch Roster
      const rosterRes = await fetch(`https://api.guildwars2.com/v2/guild/${guild.id}/members?access_token=${guild.leaderToken}`);
      if (!rosterRes.ok) {
        console.error(`Failed to fetch roster for guild ${guild.name} (${guild.id})`);
      } else {
        const apiMembers: GW2Member[] = await rosterRes.json();
        const apiMemberMap = new Map(apiMembers.map(m => [m.name, m]));

        // Check current database members who are already associated with THIS guild
        const currentDbMembers = await prisma.member.findMany({ 
          where: { 
            OR: [
              { guildId: guild.id },
              { subGuildId: guild.id }
            ]
          } 
        });

        for (const dbMember of currentDbMembers) {
          const apiData = apiMemberMap.get(dbMember.accountName);
          if (!apiData) {
            // Member left THIS guild.
            const updateData: any = {};
            if (dbMember.guildId === guild.id) {
              updateData.status = "INACTIVE_LEFT";
              updateData.guildId = null;
            }
            if (dbMember.subGuildId === guild.id) {
              updateData.subGuildId = null;
            }

            if (guild.isAllianceGuild) {
              updateData.isAllianceMember = false;
              updateData.wvwMember = false;
            }
            
            await prisma.member.update({ where: { id: dbMember.id }, data: updateData });
            
            await prisma.memberHistory.create({
              data: { memberId: dbMember.id, eventType: "LEFT", oldValue: `${guild.name} [${guild.tag}]` }
            });
            logs.push(`${dbMember.accountName} left ${guild.name} [${guild.tag}]`);
          } else {
            // Still in this guild
            const dataToUpdate: any = { lastSeenAt: new Date(), status: "ACTIVE" };
            
            // If it's the primary guild, update rank
            if (dbMember.guildId === guild.id && dbMember.rank !== apiData.rank) {
              dataToUpdate.rank = apiData.rank;
              await prisma.memberHistory.create({
                data: { memberId: dbMember.id, eventType: "RANK_CHANGE", oldValue: dbMember.rank, newValue: apiData.rank }
              });
            }

            if (guild.isAllianceGuild) {
              dataToUpdate.isAllianceMember = true;
              dataToUpdate.guildId = guild.id; // Ensure Frog is primary if processed last
              if (dbMember.wvwMember !== apiData.wvw_member) {
                dataToUpdate.wvwMember = apiData.wvw_member;
                await prisma.memberHistory.create({
                  data: { memberId: dbMember.id, eventType: "WVW_STATUS_CHANGE", oldValue: String(dbMember.wvwMember), newValue: String(apiData.wvw_member) }
                });
              }
            } else {
              // It's a sub-guild
              dataToUpdate.subGuildId = guild.id;
              // If they have no primary guild yet, set this as primary too
              if (!dbMember.guildId) {
                dataToUpdate.guildId = guild.id;
                dataToUpdate.rank = apiData.rank;
              }
            }
            
            await prisma.member.update({ where: { id: dbMember.id }, data: dataToUpdate });
          }
        }

        // --- Process API members (not currently linked to this guild in DB) ---
        for (const apiData of apiMembers) {
          if (currentDbMembers.find(m => m.accountName === apiData.name)) continue;

          const globalExists = await prisma.member.findUnique({ where: { accountName: apiData.name } });
          if (globalExists) {
            const updateData: any = { status: "ACTIVE", lastSeenAt: new Date() };
            
            if (guild.isAllianceGuild) {
              updateData.isAllianceMember = true;
              updateData.wvwMember = apiData.wvw_member;
              updateData.guildId = guild.id;
              updateData.rank = apiData.rank;
            } else {
              updateData.subGuildId = guild.id;
              if (!globalExists.guildId) {
                updateData.guildId = guild.id;
                updateData.rank = apiData.rank;
              }
            }

            await prisma.member.update({ where: { id: globalExists.id }, data: updateData });
            
            if (globalExists.status !== "ACTIVE") {
              await prisma.memberHistory.create({
                data: { memberId: globalExists.id, eventType: "JOINED", newValue: `${guild.name} [${guild.tag}]`, createdAt: new Date(apiData.joined) }
              });
            }
          } else {
            // Brand new member
            await prisma.member.create({
              data: {
                accountName: apiData.name,
                guildId: guild.id,
                subGuildId: guild.isAllianceGuild ? null : guild.id,
                status: "ACTIVE",
                rank: apiData.rank,
                wvwMember: guild.isAllianceGuild ? apiData.wvw_member : false,
                isAllianceMember: guild.isAllianceGuild,
                joinedAt: new Date(apiData.joined),
                lastSeenAt: new Date()
              }
            });
            // History entry omitted for brevity in create if joining fresh
          }
        }
      }

      // 2. Guild Logs stay the same... (omitted for brevity)
    } catch (e) {
      console.error(e);
    }
  }

  return logs;
}
