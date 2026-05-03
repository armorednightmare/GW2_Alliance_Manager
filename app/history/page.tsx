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

  const visibility = await getHistoryVisibilityFilter(user);

  if (visibility.none) {
    return (
        <div>
            <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)" }}>Allianz Historie</h1>
            <p>Nicht autorisiert, die Historie zu sehen.</p>
        </div>
    );
  }

  // Fetch from collectionGroup
  let query = db.collectionGroup("history").orderBy("timestamp", "desc").limit(limit);
  
  const snapshot = await query.get();
  
  const historyRaw = await Promise.all(snapshot.docs.map(async (doc) => {
    const data = doc.data();
    const memberDoc = await doc.ref.parent.parent?.get();
    let memberData = memberDoc?.exists ? { id: memberDoc.id, ...memberDoc.data() } as any : null;
    
    if (memberData) {
        memberData.joinedAt = memberData.joinedAt?.toDate ? memberData.joinedAt.toDate().toISOString() : memberData.joinedAt;
        memberData.lastSeenAt = memberData.lastSeenAt?.toDate ? memberData.lastSeenAt.toDate().toISOString() : memberData.lastSeenAt;
        memberData.guilds = (memberData.guilds || []).map((mg: any) => ({
            ...mg,
            lastSeenAt: mg.lastSeenAt?.toDate ? mg.lastSeenAt.toDate().toISOString() : mg.lastSeenAt
        }));
    }

    return sanitizeData({
      id: doc.id,
      ...data,
      timestamp: data.timestamp || data.createdAt,
      createdAt: data.timestamp || data.createdAt,
      member: memberData,
      memberId: memberData?.id || data.memberId || null
    });
  }));

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
        const isComment = h.type === "COMMENT_ADDED" || h.type === "COMMENT_CHANGED";
        if (isComment) return false;

        const isAllianceRelevant = h.member.isAllianceMember || h.member.status === "INACTIVE_LEFT";
        if (!isAllianceRelevant) return false;

        const isPublicEvent = ["RANK_CHANGE", "WVW_STATUS_CHANGE", "JOINED", "LEFT"].includes(h.type);
        if (isPublicEvent) return true;

        return false;
    });
  }

  const initialTotalSnapshot = await db.collectionGroup("history").count().get();
  const initialTotal = initialTotalSnapshot.data().count;

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
      <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)" }}>Allianz Historie</h1>
      <p style={{ opacity: 0.8 }}>Hier sehen Sie die Aktivitäten aller Mitglieder (Beitritte, Austritte, Änderungen des WvW-Status).</p>

      <div className="table-wrapper">
        <HistoryClient initialHistory={maskedHistory} initialTotal={initialTotal} />
      </div>
    </div>
  );
}
