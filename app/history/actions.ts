"use server";
import { db } from "@/lib/firebase-admin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AuthUser, canSeeRank, getHistoryVisibilityFilter } from "@/lib/permissions";
import { sanitizeData } from "@/lib/utils";


export async function fetchHistoryLogs(page: number, limit: number, search: string) {
  const session = await getServerSession(authOptions);
  const user = (session as any)?.user as AuthUser | undefined;
  const visibility = await getHistoryVisibilityFilter(user);

  if (visibility.none) return { data: [], total: 0 };

  // Note: For large datasets, this would need a proper search engine or better indexing.
  // For < 1000 items, we fetch a chunk and filter.
  // Ideally, we'd fetch ALL and then filter/paginate, but that's expensive.
  // For now, we fetch the latest 200 items and search/paginate within them.
  const snapshot = await db.collectionGroup("history").orderBy("timestamp", "desc").limit(200).get();
  
  const historyRaw = await Promise.all(snapshot.docs.map(async (doc) => {
    const data = doc.data();
    const memberDoc = await doc.ref.parent.parent?.get();
    const memberData = memberDoc?.exists ? { id: memberDoc.id, ...memberDoc.data() } as any : null;
    
    return {
      id: doc.id,
      ...data,
      createdAt: data.timestamp?.toDate() || new Date(),
      member: memberData,
      memberId: memberData?.id || data.memberId || null
    };
  }));

  // Filtering based on visibility rules
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
        const isAllianceRelevant = h.member.isAllianceMember || h.member.status === "INACTIVE_LEFT";
        if (!isAllianceRelevant) return false;
        return ["RANK_CHANGE", "WVW_STATUS_CHANGE", "JOINED", "LEFT"].includes(eventType);
    });
  }

  // Filtering based on search
  if (search.trim()) {
    const s = search.toLowerCase();
    filtered = filtered.filter(h => {
        const accountName = h.member?.accountName?.toLowerCase() || "";
        const oldVal = (h.oldValue || "").toLowerCase();
        const newVal = (h.newValue || "").toLowerCase();
        const eventType = (h.eventType || h.type || "").toLowerCase();
        return accountName.includes(s) || oldVal.includes(s) || newVal.includes(s) || eventType.includes(s);
    });
  }

  const total = filtered.length;
  const skip = (page - 1) * limit;
  const paged = filtered.slice(skip, skip + limit);

  // Mask rank changes
  const maskedData = paged.map(h => {
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

  return sanitizeData({ data: maskedData, total });
}
