import { AuthUser } from "./permissions-client";
import { db } from "./firebase-admin";

export * from "./permissions-client";

export async function getCommentEventFilter(user: AuthUser | null | undefined) {
  // This is a placeholder as collectionGroup queries are different in Firestore
  // We handle visibility filtering in-memory or via separate queries in the actions/pages
  return null; 
}

/**
 * Returns visibility rules for MemberHistory based on user role.
 */
export async function getHistoryVisibilityFilter(user: AuthUser | null | undefined) {
  if (!user || user.role === "WEB_MEMBER") {
    return { none: true };
  }

  if (user.role === "ADMIN" || user.role === "ALLIANCE_LEADER") {
    return { all: true };
  }

  if (user.role === "GUILD_LEADER") {
    const ids = user.subGuildIds || [];
    if (ids.length === 0) return { none: true };
    
    const allianceGuildsSnapshot = await db.collection("guilds").where("isAllianceGuild", "==", true).get();
    const allianceNames = allianceGuildsSnapshot.docs.map(doc => {
        const data = doc.data();
        return `${data.name} [${data.tag}]`;
    });

    return {
        managedGuildIds: ids,
        allianceNames: allianceNames,
        isGuildLeader: true
    };
  }

  return { none: true };
}
