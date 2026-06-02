export const dynamic = 'force-dynamic';
import { db } from "@/lib/firebase-admin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sanitizeData } from "@/lib/utils";
import DashboardClient from "./DashboardClient";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = (session as any)?.user;

  if (user?.role === "NEW_USER") {
    redirect("/profile?new=1");
  }

  const membersRef = db.collection("members");
  
  const inDangerSnapshot = await membersRef
    .where("isAllianceMember", "==", true)
    .where("wvwMember", "==", false)
    .where("status", "==", "ACTIVE")
    .get();
  
  const activeMembersInDanger = inDangerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const totalMembersSnapshot = await membersRef
    .where("status", "==", "ACTIVE")
    .where("isAllianceMember", "==", true)
    .count().get();
  const totalMembers = totalMembersSnapshot.data().count;

  const totalSubGuildsSnapshot = await db.collection("guilds")
    .where("isAllianceGuild", "==", false)
    .count().get();
  const totalSubGuilds = totalSubGuildsSnapshot.data().count;

  const settingsDoc = await db.collection("settings").doc("system").get();
  const settings = settingsDoc.exists ? settingsDoc.data() : null;

  let allianceName = settings?.allianceName;
  if (!allianceName) {
    const allianceGuildSnapshot = await db.collection("guilds").where("isAllianceGuild", "==", true).limit(1).get();
    const allianceGuild = allianceGuildSnapshot.empty ? null : allianceGuildSnapshot.docs[0].data();
    allianceName = allianceGuild ? `${allianceGuild.name} [${allianceGuild.tag}]` : "Allianz Manager";
  }

  const allianceGuildsSnapshot = await db.collection("guilds").where("isAllianceGuild", "==", true).get();
  const allianceGuildIds = allianceGuildsSnapshot.docs.map(doc => doc.id);

  // Note: collectionGroup requires an index in Firestore for filtering/ordering
  // We wrap this in try-catch to avoid crashing the whole dashboard if the index isn't ready
  let recentHistory: any[] = [];
  try {
    const recentHistorySnapshot = await db.collectionGroup("history")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    recentHistory = await Promise.all(recentHistorySnapshot.docs.map(async (doc) => {
      const data = doc.data();
      const memberDoc = await doc.ref.parent.parent?.get();
      return sanitizeData({
        id: doc.id,
        ...data,
        createdAt: data.timestamp?.toDate() || new Date(),
        member: memberDoc?.data() || { accountName: "Unbekannt" }
      });
    }));
  } catch (error) {
    console.error("Error fetching recent history (Check if Firestore index is created):", error);
  }

  return (
    <DashboardClient
      allianceName={allianceName}
      totalMembers={totalMembers}
      totalSubGuilds={totalSubGuilds}
      dangerMembers={sanitizeData(activeMembersInDanger)}
      recentHistory={recentHistory}
      allianceGuildIds={allianceGuildIds}
    />
  );
}
