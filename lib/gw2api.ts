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
  kicked_by?: string;
  // Others omitted
}

export async function syncAllGuildRosters() {
  const guilds = await prisma.guild.findMany({
    where: { leaderToken: { not: null } },
  });

  const syncLogs: string[] = [];

  for (const guild of guilds) {
    if (!guild.leaderToken) continue;

    try {
      // 1. Fetch Roster
      const rosterRes = await fetch(`https://api.guildwars2.com/v2/guild/${guild.id}/members?access_token=${guild.leaderToken}`);
      if (!rosterRes.ok) {
        console.error(`Failed to fetch roster for guild ${guild.name} (${guild.id})`);
        continue;
      }
      const apiMembers: GW2Member[] = await rosterRes.json();
      const apiMemberMap = new Map(apiMembers.map(m => [m.name, m]));

      let startingRoleName: string | null = null;
      if (guild.isAllianceGuild) {
        const ranksRes = await fetch(`https://api.guildwars2.com/v2/guild/${guild.id}/ranks?access_token=${guild.leaderToken}`);
        if (ranksRes.ok) {
          const ranks = await ranksRes.json();
          const sr = ranks.find((r: any) => r.permissions.includes("StartingRole"));
          if (sr) startingRoleName = sr.id;
        }
      }

      const logsRes = await fetch(`https://api.guildwars2.com/v2/guild/${guild.id}/log?access_token=${guild.leaderToken}`);
      const inviterMap = new Map<string, string>();
      const kickMap = new Map<string, string>();

      if (logsRes.ok) {
        const logs: GW2LogEntry[] = await logsRes.json();
        // Process logs from oldest to newest so newest action takes precedence if multiple exist
        logs.reverse().forEach(log => {
          if (log.type === 'invited' && log.user && log.invited_by) {
            inviterMap.set(log.user, log.invited_by);
          }
          if (log.type === 'kick' && log.user && log.kicked_by) {
            kickMap.set(log.user, log.kicked_by);
          }
        });
      }

      // 3. Process existing database memberships for THIS guild
      const currentDbMemberships = await prisma.memberGuild.findMany({
        where: { guildId: guild.id },
        include: { member: true }
      });

      for (const membership of currentDbMemberships) {
        const apiData = apiMemberMap.get(membership.member.accountName);
        if (!apiData) {
          // Member left THIS specific guild
          await prisma.memberGuild.delete({
            where: { id: membership.id }
          });

          const kicker = kickMap.get(membership.member.accountName);

          await prisma.memberHistory.create({
            data: { 
              memberId: membership.memberId, 
              eventType: kicker ? "KICKED" : "LEFT", 
              description: kicker ? `Aus ${guild.name} [${guild.tag}] entfernt (durch ${kicker})` : undefined,
              newValue: `${guild.name} [${guild.tag}]` 
            }
          });
          syncLogs.push(`${membership.member.accountName} left ${guild.name} [${guild.tag}]`);

          // If no memberships left anywhere, mark as INACTIVE
          const allGuilds = await prisma.memberGuild.findMany({ where: { memberId: membership.memberId } });
          if (allGuilds.length === 0) {
            const pastIds = [guild.id, ...allGuilds.map(g => g.guildId)];
            
            await prisma.member.update({
              where: { id: membership.memberId },
              data: { 
                status: kicker ? "INACTIVE_KICKED" : "INACTIVE_LEFT", 
                isAllianceMember: false, 
                wvwMember: false,
                leftAt: new Date(),
                pastGuildIds: pastIds,
                wasAllianceMember: membership.member.isAllianceMember
              }
            });
          } else {
             // Still in other guilds, just recalculate alliance member status
             // (Master branch handles this at the end of sync or via other guild syncs)
          }
        } else {
          // Still in this guild - Check for rank changes
          if (membership.rank !== apiData.rank) {
            await prisma.memberGuild.update({
              where: { id: membership.id },
              data: { rank: apiData.rank, lastSeenAt: new Date() }
            });
            await prisma.memberHistory.create({
              data: { 
                memberId: membership.memberId, 
                eventType: "RANK_CHANGE", 
                oldValue: `${membership.rank} (${guild.tag})`, 
                newValue: `${apiData.rank} (${guild.tag})` 
              }
            });
          } else {
            await prisma.memberGuild.update({
              where: { id: membership.id },
              data: { lastSeenAt: new Date() }
            });
          }

          // Update global member status
          const updateData: any = { status: "ACTIVE", lastSeenAt: new Date() };
          if (guild.isAllianceGuild) {
            updateData.isAllianceMember = true;
            updateData.wvwMember = apiData.wvw_member;
            if (startingRoleName) {
              updateData.isAllianceRecruit = (apiData.rank === startingRoleName);
            }
          }
          await prisma.member.update({ where: { id: membership.memberId }, data: updateData });
        }
      }

      // 4. Process API members (add new memberships)
      for (const apiData of apiMembers) {
        // Skip if they already have a membership record for this guild
        if (currentDbMemberships.find(m => m.member.accountName === apiData.name)) continue;

        // Find or Create the base member
        const inviter = inviterMap.get(apiData.name);
        const member = await prisma.member.upsert({
          where: { accountName: apiData.name },
          update: { 
            status: "ACTIVE", 
            lastSeenAt: new Date(),
            ...(inviter ? { invitedBy: inviter } : {}),
            ...(guild.isAllianceGuild ? { 
              isAllianceMember: true, 
              wvwMember: apiData.wvw_member,
              isAllianceRecruit: (startingRoleName && apiData.rank === startingRoleName) ? true : false
            } : {})
          },
          create: {
            accountName: apiData.name,
            status: "ACTIVE",
            joinedAt: new Date(apiData.joined),
            lastSeenAt: new Date(),
            invitedBy: inviter || null,
            isAllianceMember: guild.isAllianceGuild,
            wvwMember: guild.isAllianceGuild ? apiData.wvw_member : false,
            isAllianceRecruit: (guild.isAllianceGuild && startingRoleName && apiData.rank === startingRoleName) ? true : false,
          }
        });

        // Add the guild membership
        await prisma.memberGuild.create({
          data: {
            memberId: member.id,
            guildId: guild.id,
            rank: apiData.rank,
            lastSeenAt: new Date()
          }
        });

        await prisma.memberHistory.create({
          data: { 
            memberId: member.id, 
            eventType: "JOINED", 
            newValue: `${guild.name} [${guild.tag}]`,
            createdAt: new Date(apiData.joined)
          }
        });
        syncLogs.push(`${apiData.name} joined ${guild.name} [${guild.tag}]`);
      }

    } catch (e: any) {
      console.error(`Sync Error for guild ${guild.name}:`, e.message);
    }
  }

  return syncLogs;
}
