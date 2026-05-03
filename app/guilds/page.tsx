export const dynamic = 'force-dynamic';
import { db } from "@/lib/firebase-admin";
import GuildsClient from "./GuildsClient";
import "../members/Members.css"; // Reuse styling for data tables
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sanitizeData } from "@/lib/utils";

export default async function GuildsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
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

  const totalAllianceMembersSnapshot = await db.collection("members")
    .where("isAllianceMember", "==", true)
    .where("status", "==", "ACTIVE")
    .count().get();
  
  const totalAllianceMembers = totalAllianceMembersSnapshot.data().count;

  return (
    <div>
      <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)"}}>Gilden</h1>
      <p style={{ opacity: 0.8 }}>Hier sehen Sie alle verknüpften Gilden, deren Mitgliederanzahl und den Anteil zur Allianz. Anklicken der Köpfe sortiert die Tabelle.</p>
      
      <GuildsClient initialGuilds={sanitizeData(guildsWithStats)} totalAllianceMembers={totalAllianceMembers} />
    </div>
  );
}
