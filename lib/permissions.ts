import { AuthUser } from "./permissions-client";

export * from "./permissions-client";

export async function getCommentEventFilter(user: AuthUser | null | undefined) {
  return await getHistoryVisibilityFilter(user);
}

/**
 * Returns a Prisma filter for MemberHistory visibility based on user role.
 * This is SERVER-ONLY as it imports Prisma.
 */
export async function getHistoryVisibilityFilter(user: AuthUser | null | undefined) {
  if (!user || user.role === "WEB_MEMBER") {
    return { id: "none" };
  }

  if (user.role === "ADMIN" || user.role === "ALLIANCE_LEADER") {
    return {};
  }

  if (user.role === "GUILD_LEADER") {
    const ids = user.subGuildIds || [];
    if (ids.length === 0) return { id: "none" };
    
    // Server-only: import prisma
    const { prisma } = await import("./prisma");
    const allianceGuilds = await prisma.guild.findMany({ where: { isAllianceGuild: true } });
    const allianceNames = allianceGuilds.map(g => `${g.name} [${g.tag}]`);

    return {
      OR: [
        // Rule 1: Members in any of their managed sub-guilds
        { member: { guilds: { some: { guildId: { in: ids } } } } },
        
        // Rule 2: Alliance-wide events for others (exclude comments)
        {
          AND: [
            { member: { OR: [ { isAllianceMember: true }, { status: "INACTIVE_LEFT" } ] } },
            { NOT: { eventType: { in: ["COMMENT_ADDED", "COMMENT_CHANGED"] } } },
            {
              OR: [
                { eventType: { in: ["RANK_CHANGE", "WVW_STATUS_CHANGE"] } },
                { oldValue: { in: allianceNames } },
                { newValue: { in: allianceNames } }
              ]
            }
          ]
        }
      ]
    } as any;
  }

  return { id: "none" };
}
