export const dynamic = 'force-dynamic';
import { db } from "@/lib/firebase-admin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sanitizeData } from "@/lib/utils";
import DashboardClient from "./DashboardClient";
import { getHistoryVisibilityFilter, AuthUser, canSeeRank } from "@/lib/permissions";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = (session as any)?.user;

  if (user?.role === "NEW_USER") {
    redirect("/profile?new=1");
  }

  const membersRef = db.collection("members");
  
  const inDangerSnapshot = await membersRef
    .where("isAllianceMember", "==", true)
    .where("wvwMember", "==", false)
    .where("status", "==", "ACTIVE")
    .get();
  
  const activeMembersInDanger = inDangerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const totalMembersSnapshot = await membersRef
    .where("status", "==", "ACTIVE")
    .where("isAllianceMember", "==", true)
    .count().get();
  const totalMembers = totalMembersSnapshot.data().count;

  const totalSubGuildsSnapshot = await db.collection("guilds")
    .where("isAllianceGuild", "==", false)
    .count().get();
  const totalSubGuilds = totalSubGuildsSnapshot.data().count;

  const settingsDoc = await db.collection("settings").doc("system").get();
  const settings = settingsDoc.exists ? settingsDoc.data() : null;

  let allianceName = settings?.allianceName;
  if (!allianceName) {
    const allianceGuildSnapshot = await db.collection("guilds").where("isAllianceGuild", "==", true).limit(1).get();
    const allianceGuild = allianceGuildSnapshot.empty ? null : allianceGuildSnapshot.docs[0].data();
    allianceName = allianceGuild ? `${allianceGuild.name} [${allianceGuild.tag}]` : "Allianz Manager";
  }

  const allianceGuildsSnapshot = await db.collection("guilds").where("isAllianceGuild", "==", true).get();
  const allianceGuildIds = allianceGuildsSnapshot.docs.map(doc => doc.id);

  const visibility = await getHistoryVisibilityFilter(user as AuthUser | undefined);

  let recentHistory: any[] = [];
  if (!visibility.none) {
    try {
      const recentHistorySnapshot = await db.collectionGroup("history")
        .orderBy("timestamp", "desc")
        .limit(100)
        .get();

      // Optimize: Fetch members once in parallel chunks
      const uniqueMemberIds = Array.from(new Set(recentHistorySnapshot.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean))) as string[];
      const memberMap = new Map();
      const chunkSize = 50;
      for (let i = 0; i < uniqueMemberIds.length; i += chunkSize) {
          const chunk = uniqueMemberIds.slice(i, i + chunkSize);
          const memberDocs = await Promise.all(chunk.map(id => db.collection("members").doc(id).get()));
          memberDocs.forEach(doc => {
              if (doc.exists) memberMap.set(doc.id, { id: doc.id, ...doc.data() });
          });
      }

      const historyRaw = recentHistorySnapshot.docs.map((doc) => {
        const data = doc.data();
        const mId = doc.ref.parent.parent?.id;
        const memberData = mId ? memberMap.get(mId) : null;
        return {
          id: doc.id,
          ...data,
          createdAt: data.timestamp?.toDate() || new Date(),
          member: memberData,
        };
      });

      // Filter by visibility rules
      let filtered = historyRaw;
      if (visibility.isGuildLeader) {
        const managedIds = visibility.managedGuildIds || [];
        filtered = historyRaw.filter(h => {
            if (!h.member) return false;
            const inManaged = (h.member.guilds || []).some((mg: any) => managedIds.includes(mg.id));
            if (inManaged) return true;
            const eventType = h.eventType || h.type;
            const isComment = eventType === "COMMENT_ADDED" || eventType === "COMMENT_CHANGED";
            if (isComment) return false;
            const isAllianceRelevant = h.member.isAllianceMember || h.member.status === "INACTIVE_LEFT" || h.member.status === "INACTIVE_KICKED";
            if (!isAllianceRelevant) return false;
            return ["RANK_CHANGE", "WVW_STATUS_CHANGE", "JOINED", "LEFT"].includes(eventType);
        });
      }

      // Fetch guilds to ensure accurate rank visibility checks by tag
      const guildsSnap = await db.collection("guilds").get();
      const guildByTag = new Map(guildsSnap.docs.map(doc => [doc.data().tag, { id: doc.id, ...doc.data() }]));

      // Filter out rank changes user doesn't have permission to see
      const authorizedFiltered = filtered.filter(h => {
        const eventType = h.eventType || h.type;
        if (eventType === "RANK_CHANGE") {
          const tagMatch = h.newValue?.match(/\(([^)]+)\)/) || h.oldValue?.match(/\(([^)]+)\)/);
          if (tagMatch) {
             const tag = tagMatch[1];
             const guild = guildByTag.get(tag) || h.member?.guilds?.find((mg: any) => mg.tag === tag);
             if (guild && !canSeeRank(user as AuthUser | undefined, guild as any)) {
               return false;
             }
          }
        }
        return true;
      });

      recentHistory = sanitizeData(authorizedFiltered.slice(0, 10));
    } catch (error) {
      console.error("Error fetching recent history (Check if Firestore index is created):", error);
    }
  }

  return (
    <DashboardClient
      allianceName={allianceName}
      totalMembers={totalMembers}
      totalSubGuilds={totalSubGuilds}
      dangerMembers={sanitizeData(activeMembersInDanger)}
      recentHistory={recentHistory}
      allianceGuildIds={allianceGuildIds}
    />
  );
}
