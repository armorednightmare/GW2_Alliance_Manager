export type CustomRole = "ADMIN" | "ALLIANCE_LEADER" | "GUILD_LEADER" | "WEB_MEMBER";

export interface AuthUser {
  id: string;
  role: CustomRole | string;
  guildId?: string | null;

  subGuildIds?: string[]; // Multiple managed guilds
}

export function canManageUsers(user: AuthUser | null | undefined): boolean {
  return user?.role === "ADMIN" || user?.role === "ALLIANCE_LEADER";
}

export function canManageGuilds(user: AuthUser | null | undefined): boolean {
  return (
    user?.role === "ADMIN" ||
    user?.role === "ALLIANCE_LEADER" ||
    user?.role === "GUILD_LEADER"
  );
}

export function isHigherStaff(user: AuthUser | null | undefined): boolean {
  return user?.role === "ADMIN" || user?.role === "ALLIANCE_LEADER";
}

export function canEditTheme(user: AuthUser | null | undefined): boolean {
  return user?.role === "ADMIN" || user?.role === "ALLIANCE_LEADER";
}

export function canSeeComments(user: AuthUser | null | undefined): boolean {
  return !!user && (user.role === "ADMIN" || user.role === "ALLIANCE_LEADER" || user.role === "GUILD_LEADER");
}

export async function getCommentEventFilter(user: AuthUser | null | undefined) {
  return await getHistoryVisibilityFilter(user);
}

/**
 * Returns a Prisma filter for MemberHistory visibility based on user role.
 * Guild Leaders are restricted to their own members.
 * Web members/guests see nothing in the global history.
 */
export async function getHistoryVisibilityFilter(user: AuthUser | null | undefined) {
  if (!user || user.role === "WEB_MEMBER") {
    // Web members/guests don't see any global history
    return { id: "none" };
  }

  if (user.role === "ADMIN" || user.role === "ALLIANCE_LEADER") {
    // Alliance staff sees everything
    return {};
  }

  if (user.role === "GUILD_LEADER") {
    const ids = user.subGuildIds || [];
    if (ids.length === 0) return { id: "none" };
    
    // Fetch names of alliance guilds to identify alliance-wide events
    const { prisma } = await import("./prisma");
    const allianceGuilds = await prisma.guild.findMany({ where: { isAllianceGuild: true } });
    const allianceNames = allianceGuilds.map(g => `${g.name} [${g.tag}]`);

    // Guild Leaders see:
    // 1. ALL events for their managed sub-guild members
    // 2. ONLY Alliance-wide events (Rank, WvW status, Join/Leave alliance) for others
    return {
      OR: [
        // Rule 1: Own managed guilds (see everything)
        { member: { subGuildId: { in: ids } } },
        
        // Rule 2: Alliance-wide events for others (exclude comments)
        {
          AND: [
            { member: { OR: [ { isAllianceMember: true }, { status: "INACTIVE_LEFT" } ] } },
            { NOT: { eventType: { in: ["COMMENT_ADDED", "COMMENT_CHANGED"] } } },
            {
              OR: [
                { eventType: { in: ["RANK_CHANGE", "WVW_STATUS_CHANGE"] } }, // General alliance status
                { oldValue: { in: allianceNames } }, // Left Alliance Guild
                { newValue: { in: allianceNames } }  // Joined Alliance Guild
              ]
            }
          ]
        }
      ]
    } as any;
  }

  return { id: "none" };
}


export function canEditMember(user: AuthUser | null | undefined, memberSubGuildId: string | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "ALLIANCE_LEADER") return true;
  // For Guild Leaders, we check if the member belongs to ANY of their sub-guilds
  if (user.role === "GUILD_LEADER" && user.subGuildIds && memberSubGuildId) {
    return user.subGuildIds.includes(memberSubGuildId);
  }
  return false;
}

/**
 * Returns a Prisma filter object that restricts member visibility based on user role.
 */
export function getMemberVisibilityFilter(user: AuthUser | null | undefined) {
  // 1. ADMINs see everything
  if (user?.role === "ADMIN") return {};

  // 2. GUILD_LEADERs see: All Alliance members + members of ANY of their own sub-guilds
  if (user?.role === "GUILD_LEADER") {
    const ids = user.subGuildIds || [];
    return {
      OR: [
        { isAllianceMember: true },
        { subGuildId: { in: ids.length > 0 ? ids : ["none"] } },
        { status: "INACTIVE_LEFT" }
      ]
    };
  }

  if (user?.role === "ALLIANCE_LEADER") {
    return {
      OR: [
        { isAllianceMember: true },
        { status: "INACTIVE_LEFT" }
      ]
    };
  }

  // 3. WEB_MEMBERs and GUESTS only see actual Alliance members
  return { isAllianceMember: true };
}

/**
 * Helper to check if a user is authorized for a specific guild action
 */
export function isAuthorizedForGuild(user: AuthUser | null | undefined, guildId: string): boolean {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "ALLIANCE_LEADER") return true;
  if (user.role === "GUILD_LEADER" && user.subGuildIds?.includes(guildId)) return true;
  return false;
}
