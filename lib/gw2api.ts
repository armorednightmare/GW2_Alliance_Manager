import { db } from "./firebase-admin";

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
  const guildsSnapshot = await db.collection("guilds").where("leaderToken", "!=", null).get();
  const syncLogs: string[] = [];

  for (const guildDoc of guildsSnapshot.docs) {
    const guild = { id: guildDoc.id, ...guildDoc.data() } as any;
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

      // 2. Fetch Logs (to find invite info)
      const logsRes = await fetch(`https://api.guildwars2.com/v2/guild/${guild.id}/log?access_token=${guild.leaderToken}`);
      const inviterMap = new Map<string, string>();
      if (logsRes.ok) {
        const logs: GW2LogEntry[] = await logsRes.json();
        logs.reverse().forEach(log => {
          if (log.type === 'invited' && log.user && log.invited_by) {
            inviterMap.set(log.user, log.invited_by);
          }
        });
      }

      // 3. Find members in DB who are supposedly in this guild
      // We look for members where the 'guilds' array contains this guildId
      const membersInGuildSnapshot = await db.collection("members").where("guilds", "array-contains", { id: guild.id }).get();
      
      for (const memberDoc of membersInGuildSnapshot.docs) {
        const member = { id: memberDoc.id, ...memberDoc.data() } as any;
        const apiData = apiMemberMap.get(member.accountName);

        if (!apiData) {
          // Member left THIS specific guild
          const remainingGuilds = (member.guilds || []).filter((g: any) => g.id !== guild.id);
          const updateData: any = { guilds: remainingGuilds };

          if (remainingGuilds.length === 0) {
            updateData.status = "INACTIVE_LEFT";
            updateData.isAllianceMember = false;
            updateData.wvwMember = false;
          }

          await memberDoc.ref.update(updateData);
          await memberDoc.ref.collection("history").add({
            eventType: "LEFT",
            description: `${guild.name} [${guild.tag}] verlassen`,
            timestamp: new Date()
          });
          syncLogs.push(`${member.accountName} left ${guild.name} [${guild.tag}]`);
        } else {
          // Still in this guild - Check for rank changes
          const guildMembership = member.guilds.find((g: any) => g.id === guild.id);
          if (guildMembership.rank !== apiData.rank) {
            const updatedGuilds = member.guilds.map((g: any) => 
              g.id === guild.id ? { ...g, rank: apiData.rank, lastSeenAt: new Date() } : g
            );
            
            const updateData: any = { 
              guilds: updatedGuilds,
              status: "ACTIVE",
              lastSeenAt: new Date()
            };
            if (guild.isAllianceGuild) {
              updateData.isAllianceMember = true;
              updateData.wvwMember = apiData.wvw_member;
            }

            await memberDoc.ref.update(updateData);
            await memberDoc.ref.collection("history").add({
              eventType: "RANK_CHANGE",
              oldValue: `${guildMembership.rank} (${guild.tag})`,
              newValue: `${apiData.rank} (${guild.tag})`,
              timestamp: new Date()
            });
          } else {
            // Just update last seen
            await memberDoc.ref.update({ lastSeenAt: new Date() });
          }
          // Remove from apiMemberMap so we only have NEW members left
          apiMemberMap.delete(member.accountName);
        }
      }

      // 4. Process remaining API members (add new memberships)
      for (const [accountName, apiData] of apiMemberMap) {
        // Find if member already exists in DB (maybe in other guilds)
        const existingMemberSnapshot = await db.collection("members").where("accountName", "==", accountName).limit(1).get();
        
        let memberRef;
        let existingGuilds: any[] = [];
        let isNew = false;

        if (existingMemberSnapshot.empty) {
          memberRef = db.collection("members").doc();
          isNew = true;
        } else {
          memberRef = existingMemberSnapshot.docs[0].ref;
          existingGuilds = existingMemberSnapshot.docs[0].data().guilds || [];
        }

        const inviter = inviterMap.get(accountName);
        const newMembership = {
          id: guild.id,
          name: guild.name,
          tag: guild.tag,
          rank: apiData.rank,
          lastSeenAt: new Date()
        };

        const memberData: any = {
          accountName: accountName,
          status: "ACTIVE",
          lastSeenAt: new Date(),
          guilds: [...existingGuilds, newMembership],
          ...(inviter ? { invitedBy: inviter } : {}),
          ...(guild.isAllianceGuild ? { isAllianceMember: true, wvwMember: apiData.wvw_member } : {})
        };

        if (isNew) {
          memberData.joinedAt = new Date(apiData.joined);
          await memberRef.set(memberData);
        } else {
          await memberRef.update(memberData);
        }

        await memberRef.collection("history").add({
          eventType: "JOINED",
          description: `${guild.name} [${guild.tag}] beigetreten`,
          newValue: `${guild.name} [${guild.tag}]`,
          timestamp: new Date(apiData.joined)
        });

        syncLogs.push(`${accountName} joined ${guild.name} [${guild.tag}]`);
      }

    } catch (e: any) {
      console.error(`Sync Error for guild ${guild.name}:`, e.message);
    }
  }
  return syncLogs;
}
