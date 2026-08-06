export const dynamic = 'force-dynamic';
import { db } from "@/lib/firebase-admin";
import MembersClient from "./MembersClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMemberVisibilityFilter, AuthUser, canSeeRank } from "@/lib/permissions";
import { sanitizeData } from "@/lib/utils";
import { unstable_cache } from 'next/cache';

const getCachedMembers = unstable_cache(
  async () => {
    const usersSnapshot = await db.collection("users").get();
    const userByMemberId = new Map();
    usersSnapshot.docs.forEach(doc => {
      const u = doc.data() as any;
      if (u.memberId) {
        userByMemberId.set(u.memberId, { id: doc.id, name: u.name, discordId: u.discordId });
      }
    });

    const membersSnapshot = await db.collection("members").orderBy("accountName", "asc").get();
    return membersSnapshot.docs.map(doc => {
      const m = doc.data() as any;
      const linkedUser = userByMemberId.get(doc.id) || null;
      return {
        id: doc.id,
        ...m,
        linkedUser,
        joinedAt: m.joinedAt?.toDate ? m.joinedAt.toDate().toISOString() : m.joinedAt,
        leftAt: m.leftAt?.toDate ? m.leftAt.toDate().toISOString() : m.leftAt,
        lastUpdatedAt: m.lastUpdatedAt?.toDate ? m.lastUpdatedAt.toDate().toISOString() : m.lastUpdatedAt,
        lastSeenAt: m.lastSeenAt?.toDate ? m.lastSeenAt.toDate().toISOString() : m.lastSeenAt,
        guilds: (m.guilds || []).map((mg: any) => ({
          ...mg,
          lastUpdatedAt: mg.lastUpdatedAt?.toDate ? mg.lastUpdatedAt.toDate().toISOString() : mg.lastUpdatedAt,
          lastSeenAt: mg.lastSeenAt?.toDate ? mg.lastSeenAt.toDate().toISOString() : mg.lastSeenAt,
        }))
      };
    });
  },
  ['all-members-list'],
  { tags: ['members'], revalidate: 3600 }
);

export default async function MembersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = (session as any)?.user as AuthUser | undefined;

  if (user?.role === "NEW_USER") {
    redirect("/profile?new=1");
  }

  let members = await getCachedMembers();

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
    guilds: (m.guilds || []).map((mg: any) => ({
      ...mg,
      rank: canSeeRank(user, mg as any) ? mg.rank : "",
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
