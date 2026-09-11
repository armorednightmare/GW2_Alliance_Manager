export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/firebase-admin";
import UserManagementClient from "./UserManagementClient";
import GuildManagementClient from "./GuildManagementClient";
import RoleManagementClient from "./RoleManagementClient";
import ImportManagementClient from "./ImportManagementClient";
import AdminClient from "./AdminClient";

import { canManageUsers, canManageGuilds, canEditTheme, isHigherStaff } from "@/lib/permissions";
import { sanitizeData } from "@/lib/utils";

const PANEL_STYLE = {
  marginTop: "2rem",
  padding: "1.5rem",
  background: "rgba(0,0,0,0.2)",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.06)",
} as const;

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;

  if (
    user.role !== "ADMIN" &&
    user.role !== "ALLIANCE_LEADER" &&
    user.role !== "GUILD_LEADER"
  ) {
    redirect("/");
  }

  // --- Data Fetching ---
  const settingsSnapshot = await db.collection("settings").doc("system").get();
  const settings = settingsSnapshot.exists ? sanitizeData(settingsSnapshot.data()) : null;

  const allianceGuildSnapshot = await db.collection("guilds").where("isAllianceGuild", "==", true).limit(1).get();
  const allianceGuildDoc = allianceGuildSnapshot.empty ? null : allianceGuildSnapshot.docs[0];
  const allianceGuild = allianceGuildDoc ? allianceGuildDoc.data() : null;
  const defaultAllianceName = allianceGuild ? `${allianceGuild.name} [${allianceGuild.tag}]` : "Allianz Manager";
  
  let allianceRanks: string[] = [];
  if (allianceGuild && allianceGuild.leaderToken && allianceGuildDoc) {
    try {
      const res = await fetch(`https://api.guildwars2.com/v2/guild/${allianceGuildDoc.id}/ranks?access_token=${allianceGuild.leaderToken}`);
      if (res.ok) {
        const ranks = await res.json();
        allianceRanks = ranks.map((r: any) => r.id);
      }
    } catch (e) {
      console.error(e);
    }
  }
  
  // Users: only for Higher Staff
  let users: any[] = [];
  if (isHigherStaff(user)) {
    const usersSnapshot = await db.collection("users").orderBy("createdAt", "desc").get();
    const rawUsers = await Promise.all(usersSnapshot.docs.map(async (doc) => {
        const u = doc.data();
        let memberName = "";
        if (u.memberId) {
            const mDoc = await db.collection("members").doc(u.memberId).get();
            memberName = mDoc.exists ? mDoc.data()?.accountName : "";
        }
        return {
            id: doc.id,
            ...u,
            createdAt: u.createdAt?.toDate ? u.createdAt.toDate().toISOString() : u.createdAt,
            lastLoginAt: u.lastLoginAt?.toDate ? u.lastLoginAt.toDate().toISOString() : u.lastLoginAt,
            member: { accountName: memberName },
            managedGuilds: (u.managedGuildIds || []).map((id: string) => ({ id }))
        };
    }));
    users = sanitizeData(rawUsers);
  }

  // Full Guild list for User Management dropdowns
  const allGuildsSnapshot = await db.collection("guilds").orderBy("name", "asc").get();
  const rawAllGuilds = allGuildsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    };
  });
  const allGuilds = sanitizeData(rawAllGuilds);

  // Guilds: Filtered for the current user's view in Guild Management
  // Read managedGuildIds directly from Firestore (not from the session token)
  // so that newly added guilds show up immediately without a session refresh.
  let guilds = allGuilds;
  if (!isHigherStaff(user)) {
    const userDoc = await db.collection("users").doc(user.id).get();
    const freshManagedGuildIds: string[] = userDoc.exists ? (userDoc.data()?.managedGuildIds || []) : [];
    guilds = allGuilds.filter((g: any) => freshManagedGuildIds.includes(g.id));
  }

  // Roles: only for Higher Staff
  const manualRoles = isHigherStaff(user)
    ? sanitizeData((await db.collection("roles").orderBy("name", "asc").get()).docs.map(doc => ({ id: doc.id, ...doc.data() })))
    : [];



  return (
    <AdminClient 
      user={user}
      users={users}
      guilds={guilds}
      allGuilds={allGuilds}
      settings={settings}
      defaultAllianceName={defaultAllianceName}
      manualRoles={manualRoles}
      session={session}
      canManageUsersFlag={canManageUsers(user)}
      canManageGuildsFlag={canManageGuilds(user)}
      canEditThemeFlag={canEditTheme(user)}
      isHigherStaffFlag={isHigherStaff(user)}
      allianceRanks={allianceRanks}
    />
  );
}
