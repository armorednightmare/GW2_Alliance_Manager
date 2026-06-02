export const dynamic = 'force-dynamic';
import { db } from "@/lib/firebase-admin";
import MembersClient from "./MembersClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMemberVisibilityFilter, AuthUser, canSeeRank } from "@/lib/permissions";
import { sanitizeData } from "@/lib/utils";

export default async function MembersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = (session as any)?.user as AuthUser | undefined;

  if (user?.role === "NEW_USER") {
    redirect("/profile?new=1");
  }

  const membersSnapshot = await db.collection("members").orderBy("accountName", "asc").get();
  let members = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

  // Filtering based on role (Previously handled by database permissions)
  if (!user || user.role === "WEB_MEMBER") {
     members = members.filter((m: any) => m.isAllianceMember);
  } else if (user.role === "GUILD_LEADER") {
     const managedIds = user.subGuildIds || [];
     members = members.filter((m: any) => 
        m.isAllianceMember || 
        (m.guilds || []).some((g: any) => managedIds.includes(g.id)) ||
        ((m.status === "INACTIVE_LEFT" || m.status === "INACTIVE_KICKED") && (m.pastGuildIds || []).some((id: string) => managedIds.includes(id)))
     );
  } else if (user.role === "ALLIANCE_LEADER") {
     members = members.filter((m: any) => m.isAllianceMember || m.status === "INACTIVE_LEFT" || m.status === "INACTIVE_KICKED");
  }

  const allianceGuildSnapshot = await db.collection("guilds").where("isAllianceGuild", "==", true).limit(1).get();
  const allianceGuildId = allianceGuildSnapshot.empty ? null : allianceGuildSnapshot.docs[0].id;

  // Mask ranks for guilds the user is not part of, and serialize Timestamps
  const maskedMembers = members.map(m => ({
    ...m,
    joinedAt: m.joinedAt?.toDate ? m.joinedAt.toDate().toISOString() : m.joinedAt,
    lastUpdatedAt: (m.lastUpdatedAt || m.lastSeenAt)?.toDate ? (m.lastUpdatedAt || m.lastSeenAt).toDate().toISOString() : (m.lastUpdatedAt || m.lastSeenAt),
    guilds: (m.guilds || []).map((mg: any) => ({
      ...mg,
      rank: canSeeRank(user, mg as any) ? mg.rank : "",
      lastUpdatedAt: (mg.lastUpdatedAt || mg.lastSeenAt)?.toDate ? (mg.lastUpdatedAt || mg.lastSeenAt).toDate().toISOString() : (mg.lastUpdatedAt || mg.lastSeenAt),
    }))
  }));

  return (
    <div>
      <MembersClient 
        initialMembers={sanitizeData(maskedMembers)} 
        userRole={user?.role} 
        allianceGuildId={allianceGuildId} 
      />
    </div>
  );
}
