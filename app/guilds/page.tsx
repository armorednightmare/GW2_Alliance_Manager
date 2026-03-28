import { prisma } from "@/lib/prisma";
import GuildsClient from "./GuildsClient";
import "../members/Members.css"; // Reuse styling for data tables

export default async function GuildsPage() {
  const guilds = await prisma.guild.findMany({
    include: { members: true },
    orderBy: [
      { isAllianceGuild: 'desc' },
      { name: 'asc' }
    ]
  });

  // Calculate some stats per guild
  const guildsWithStats = guilds.map((g: any) => {
    const activeMembers = g.members.filter((m: any) => m.status === 'ACTIVE');
    const wvwMembers = activeMembers.filter((m: any) => m.wvwMember);
    return {
      id: g.id,
      name: g.name,
      tag: g.tag,
      isAllianceGuild: g.isAllianceGuild,
      hasLeaderToken: !!g.leaderToken,
      totalActive: activeMembers.length,
      wvwActive: wvwMembers.length
    };
  });

  return (
    <div>
      <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)"}}>Gilden der Allianz</h1>
      <p style={{ opacity: 0.8 }}>Hier sehen Sie alle verknüpften Gilden, deren Mitgliederanzahl und die aktuelle WvW-Vertretung. Anklicken der Köpfe sortiert die Tabelle.</p>
      
      <GuildsClient initialGuilds={guildsWithStats} />
    </div>
  );
}
