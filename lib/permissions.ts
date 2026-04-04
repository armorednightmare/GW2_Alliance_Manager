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


export function canEditMember(user: AuthUser | null | undefined, memberGuildIds: string[]): boolean {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "ALLIANCE_LEADER") return true;
  
  if (user.role === "GUILD_LEADER" && user.subGuildIds) {
    // Check if there is any overlap between user managed guilds and member guilds
    return memberGuildIds.some(id => user.subGuildIds?.includes(id));
  }
  return false;
}

/**
 * Returns a Prisma filter object that restricts member visibility based on user role.
 */
export function getMemberVisibilityFilter(user: AuthUser | null | undefined) {
  if (user?.role === "ADMIN") return {};

  if (user?.role === "GUILD_LEADER") {
    const ids = user.subGuildIds || [];
    return {
      OR: [
        { isAllianceMember: true },
        { guilds: { some: { guildId: { in: ids.length > 0 ? ids : ["none"] } } } },
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
