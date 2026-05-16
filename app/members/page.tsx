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
  // Filtering based on role
  const isRecentInactive = (m: any) => {
    if (m.status !== "INACTIVE_LEFT" && m.status !== "INACTIVE_KICKED") return false;
    if (!m.leftAt) return true; // Fallback for old data
    const leftDate = m.leftAt?.toDate ? m.leftAt.toDate() : new Date(m.leftAt);
    const diffDays = (new Date().getTime() - leftDate.getTime()) / (1000 * 3600 * 24);
    return diffDays <= 7;
  };

  if (!user || user.role === "WEB_MEMBER") {
     members = members.filter((m: any) => m.isAllianceMember);
  } else if (user.role === "GUILD_LEADER") {
     const managedIds = user.subGuildIds || [];
     members = members.filter((m: any) => 
        m.isAllianceMember || 
        (m.guilds || []).some((g: any) => managedIds.includes(g.id)) ||
        isRecentInactive(m)
     );
  } else if (user.role === "ALLIANCE_LEADER") {
     members = members.filter((m: any) => m.isAllianceMember || isRecentInactive(m));
  }

  // Mask ranks for guilds the user is not part of, and serialize Timestamps
  const maskedMembers = members.map(m => ({
    ...m,
    joinedAt: m.joinedAt?.toDate ? m.joinedAt.toDate().toISOString() : m.joinedAt,
    lastSeenAt: m.lastSeenAt?.toDate ? m.lastSeenAt.toDate().toISOString() : m.lastSeenAt,
    guilds: (m.guilds || []).map((mg: any) => ({
      ...mg,
      rank: canSeeRank(user, mg as any) ? mg.rank : "",
      lastSeenAt: mg.lastSeenAt?.toDate ? mg.lastSeenAt.toDate().toISOString() : mg.lastSeenAt,
    }))
  }));

  return (
    <div>
      <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)"}}>Mitgliederübersicht</h1>
      <p style={{ opacity: 0.8 }}>
        Hier sehen Sie alle Mitglieder, Gildenfreunde und Ausgetretene der verknüpften Gilden.
        {user?.role === "ALLIANCE_LEADER"
          ? " Sie sehen Allianzmitglieder sowie Mitglieder, die die Gilde verlassen haben."
          : user?.role === "WEB_MEMBER" || !user
            ? " Die Ansicht ist auf offizielle Allianzmitglieder beschränkt."
            : " Sie sehen Allianzmitglieder sowie Mitglieder Ihrer eigenen Gilde."}
      </p>

      <MembersClient initialMembers={sanitizeData(maskedMembers)} />
    </div>
  );
}
