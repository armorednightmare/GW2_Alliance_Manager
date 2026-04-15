export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import MembersClient from "./MembersClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { getMemberVisibilityFilter, AuthUser, canSeeRank } from "@/lib/permissions";

export default async function MembersPage() {
  const session = await getServerSession(authOptions);
  const user = (session as any)?.user as AuthUser | undefined;

  const filter = getMemberVisibilityFilter(user);

  const members = await prisma.member.findMany({
    where: filter as any,
    include: { guilds: { include: { guild: true } } },
    orderBy: { accountName: 'asc' }
  });

  // Mask ranks for guilds the user is not part of
  const maskedMembers = members.map(m => ({
    ...m,
    guilds: m.guilds.map(mg => ({
      ...mg,
      rank: canSeeRank(user, mg.guild) ? mg.rank : ""
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

      <MembersClient initialMembers={maskedMembers as any} />
    </div>
  );
}
