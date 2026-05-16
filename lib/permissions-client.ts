export type CustomRole = "ADMIN" | "ALLIANCE_LEADER" | "GUILD_LEADER" | "WEB_MEMBER" | "NEW_USER";

export interface AuthUser {
  id: string;
  role: CustomRole | string;
  guildId?: string | null;
  subGuildIds?: string[]; // Multiple managed guilds
  memberGuildIds?: string[]; // Guilds they are a member of
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

export function canEditMember(
  user: AuthUser | null | undefined, 
  memberGuildIds: string[], 
  isAllianceMember: boolean,
  leftAt?: any,
  pastGuildIds?: string[],
  wasAllianceMember?: boolean
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  let isWithinGracePeriod = false;
  if (leftAt) {
    const leftDate = leftAt?.toDate ? leftAt.toDate() : new Date(leftAt);
    const diffDays = (new Date().getTime() - leftDate.getTime()) / (1000 * 3600 * 24);
    if (diffDays <= 7) {
      isWithinGracePeriod = true;
    }
  }

  const effectiveGuildIds = isWithinGracePeriod && pastGuildIds && pastGuildIds.length > 0 
    ? [...memberGuildIds, ...pastGuildIds] 
    : memberGuildIds;

  const effectiveIsAllianceMember = isAllianceMember || (isWithinGracePeriod && !!wasAllianceMember);

  const isGuildLeaderForMember = user.subGuildIds ? effectiveGuildIds.some(id => user.subGuildIds?.includes(id)) : false;

  if (user.role === "ALLIANCE_LEADER") {
    if (effectiveIsAllianceMember) return true;
    return isGuildLeaderForMember;
  }
  
  if (user.role === "GUILD_LEADER") {
    return isGuildLeaderForMember;
  }
  
  return false;
}

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

export function isAuthorizedForGuild(user: AuthUser | null | undefined, guildId: string): boolean {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "ALLIANCE_LEADER") return true;
  if (user.role === "GUILD_LEADER" && user.subGuildIds?.includes(guildId)) return true;
  return false;
}

export function canSeeRank(user: AuthUser | null | undefined, guild: { id: string, publicRanks: boolean }): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.subGuildIds?.includes(guild.id)) return true; // Managed by this user
  if (user.memberGuildIds?.includes(guild.id)) return true; // Member of this guild

  // If publicRanks is true, Alliance Leader and regional Guild Leaders can see it.
  // Otherwise, only the above (Admin & Managers) can see it.
  if (guild.publicRanks) {
    return user.role === "ALLIANCE_LEADER" || user.role === "GUILD_LEADER";
  }

  return false;
}
