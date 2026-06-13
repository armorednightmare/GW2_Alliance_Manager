export const dynamic = 'force-dynamic';
import { db } from "@/lib/firebase-admin";
import HistoryClient from "./HistoryClient";
import "../members/Members.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHistoryVisibilityFilter, AuthUser, canSeeRank } from "@/lib/permissions";
import { sanitizeData } from "@/lib/utils";

export default async function HistoryPage() {
  const limit = 50;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = (session as any)?.user as AuthUser | undefined;
  if (user?.role === "NEW_USER") redirect("/profile?new=1");

  const visibility = await getHistoryVisibilityFilter(user);

  if (visibility.none) {
    return <HistoryClient initialHistory={[]} initialTotal={0} unauthorized={true} />;
  }

  // Fetch from collectionGroup - limit set to 200 to protect Firebase read quotas
  let query = db.collectionGroup("history").orderBy("timestamp", "desc").limit(200);
  
  const snapshot = await query.get();
  
  // Optimize member fetching (avoid N+1)
  const uniqueMemberIds = Array.from(new Set(snapshot.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean))) as string[];
  const memberMap = new Map();
  
  const chunkSize = 50;
  for (let i = 0; i < uniqueMemberIds.length; i += chunkSize) {
      const chunk = uniqueMemberIds.slice(i, i + chunkSize);
      const memberDocs = await Promise.all(chunk.map(id => db.collection("members").doc(id).get()));
      memberDocs.forEach(doc => {
          if (doc.exists) {
            let data = doc.data() as any;
            data.joinedAt = data.joinedAt?.toDate ? data.joinedAt.toDate().toISOString() : data.joinedAt;
            data.lastUpdatedAt = (data.lastUpdatedAt || data.lastSeenAt)?.toDate ? (data.lastUpdatedAt || data.lastSeenAt).toDate().toISOString() : (data.lastUpdatedAt || data.lastSeenAt);
            data.guilds = (data.guilds || []).map((mg: any) => ({
                ...mg,
                lastUpdatedAt: (mg.lastUpdatedAt || mg.lastSeenAt)?.toDate ? (mg.lastUpdatedAt || mg.lastSeenAt).toDate().toISOString() : (mg.lastUpdatedAt || mg.lastSeenAt)
            }));
            memberMap.set(doc.id, { id: doc.id, ...data });
          }
      });
  }

  const historyRaw = snapshot.docs.map((doc) => {
    const data = doc.data();
    const mId = doc.ref.parent.parent?.id;
    const memberData = mId ? memberMap.get(mId) : null;
    
    return sanitizeData({
      id: doc.id,
      ...data,
      timestamp: data.timestamp || data.createdAt,
      createdAt: data.timestamp || data.createdAt,
      member: memberData,
      memberId: memberData?.id || data.memberId || null
    });
  });

  // Filtering based on visibility rules
  let filteredHistory = historyRaw;
  if (visibility.isGuildLeader) {
    const managedIds = visibility.managedGuildIds || [];
    const allianceNames = visibility.allianceNames || [];

    filteredHistory = historyRaw.filter(h => {
        if (!h.member) return false;
        // Rule 1: Member in managed sub-guild
        const inManaged = (h.member.guilds || []).some((mg: any) => managedIds.includes(mg.id));
        if (inManaged) return true;

        // Rule 2: Alliance-wide events (exclude comments)
        const eventType = h.eventType || h.type;  // sync uses eventType, import uses type
        const isComment = eventType === "COMMENT_ADDED" || eventType === "COMMENT_CHANGED";
        if (isComment) return false;

        const isAllianceRelevant = h.member.isAllianceMember || h.member.status === "INACTIVE_LEFT" || h.member.status === "INACTIVE_KICKED";
        if (!isAllianceRelevant) return false;

        const isPublicEvent = ["RANK_CHANGE", "WVW_STATUS_CHANGE", "JOINED", "LEFT"].includes(eventType);
        if (isPublicEvent) return true;

        return false;
    });
  }

  // Use the filtered count as the total so pagination is correct on first render.
  // (The client will refetch with correct totals on any pagination interaction anyway.)
  const initialTotal = filteredHistory.length;

  // Mask rank changes
  const maskedHistory = filteredHistory.map(h => {
    if (h.type === "RANK_CHANGE") {
      const tagMatch = h.newValue?.match(/\(([^)]+)\)/) || h.oldValue?.match(/\(([^)]+)\)/);
      if (tagMatch) {
         const tag = tagMatch[1];
         const guild = h.member?.guilds?.find((mg: any) => mg.tag === tag);
         if (guild && !canSeeRank(user, guild as any)) {
           return {
             ...h,
             oldValue: h.oldValue ? "" : null,
             newValue: h.newValue ? "" : null
           };
         }
      }
    }
    return h;
  });

  return (
    <div>
      <div className="table-wrapper">
        <HistoryClient initialHistory={maskedHistory} initialTotal={initialTotal} />
      </div>
    </div>
  );
}
