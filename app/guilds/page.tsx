export const dynamic = 'force-dynamic';
import { db } from "@/lib/firebase-admin";
import GuildsClient from "./GuildsClient";
import OverlapChart from "./OverlapChart";
import "../members/Members.css"; // Reuse styling for data tables
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sanitizeData } from "@/lib/utils";

export default async function GuildsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session as any)?.user?.role === "NEW_USER") redirect("/profile?new=1");
  const guildsSnapshot = await db.collection("guilds").get();
  const guilds = guildsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

  // Sort guilds: Alliance first, then by name
  guilds.sort((a, b) => {
    if (a.isAllianceGuild && !b.isAllianceGuild) return -1;
    if (!a.isAllianceGuild && b.isAllianceGuild) return 1;
    return a.name.localeCompare(b.name);
  });

  // Fetch all active members to calculate stats in-memory
  const activeMembersSnapshot = await db.collection("members").where("status", "==", "ACTIVE").get();
  const activeMembers = activeMembersSnapshot.docs.map(doc => doc.data()) as any[];

  const guildsWithStats = guilds.map((g: any) => {
    const membersOfThisGuild = activeMembers.filter(m =>
      (m.guilds || []).some((mg: any) => mg.id === g.id)
    );

    const wvwMembers = membersOfThisGuild.filter((m: any) => m.wvwMember);

    return {
      id: g.id,
      name: g.name,
      tag: g.tag,
      isAllianceGuild: g.isAllianceGuild,
      hasLeaderToken: !!g.leaderToken,
      totalActive: membersOfThisGuild.length,
      wvwActive: wvwMembers.length
    };
  });

  // Calculate "Andere" members (Alliance members not in any registered subguild)
  const subGuildIds = new Set(guilds.filter(g => !g.isAllianceGuild).map(g => g.id));
  const andereMembers = activeMembers.filter(m =>
    m.isAllianceMember &&
    !(m.guilds || []).some((mg: any) => subGuildIds.has(mg.id))
  );
  const andereWvwMembers = andereMembers.filter((m: any) => m.wvwMember);

  guildsWithStats.push({
    id: "andere",
    name: "Andere",
    tag: "???",
    isAllianceGuild: false,
    hasLeaderToken: false,
    totalActive: andereMembers.length,
    wvwActive: andereWvwMembers.length
  });

  const totalAllianceMembersSnapshot = await db.collection("members")
    .where("isAllianceMember", "==", true)
    .where("status", "==", "ACTIVE")
    .count().get();

  const totalAllianceMembers = totalAllianceMembersSnapshot.data().count;

  return (
    <div>
      <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)" }}>Gilden</h1>
      <p style={{ opacity: 0.8 }}>Hier sehen Sie alle verknüpften Gilden, deren Mitgliederanzahl und den Anteil zur Allianz. Anklicken der Köpfe sortiert die Tabelle.</p>

      <GuildsClient initialGuilds={sanitizeData(guildsWithStats)} totalAllianceMembers={totalAllianceMembers} />

      <OverlapChart members={sanitizeData(activeMembers)} guilds={sanitizeData(guilds)} />
    </div>
  );
}
