"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";

// ── Helpers: Role Checks ─────────────────────────────────────────────────────
interface UserSession {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
    id: string;
    subGuildIds?: string[];
  };
}

async function requireAdmin(): Promise<UserSession> {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  const role = session?.user?.role;
  if (!session || (role !== "ADMIN" && role !== "ALLIANCE_LEADER")) {
    throw new Error("Nicht autorisiert (Admin- oder Allianzleiter-Rechte erforderlich)");
  }
  return session;
}


async function requireAllianceLeader(): Promise<UserSession> {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  const role = session?.user?.role;
  if (!session || (role !== "ADMIN" && role !== "ALLIANCE_LEADER")) {
    throw new Error("Nicht autorisiert (Administrator oder Allianzleiter erforderlich)");
  }
  return session;
}


async function requireGuildPermission(guildId: string): Promise<UserSession> {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session) throw new Error("Nicht eingeloggt");
  const user = session.user;
  if (user.role === "ADMIN" || user.role === "ALLIANCE_LEADER") return session;

  // Multiple subGuildIds support
  const ids = user.subGuildIds || [];
  if (user.role === "GUILD_LEADER" && ids.includes(guildId)) return session;

  throw new Error("Keine Berechtigung für diese Gilde");
}


// ── Theme Settings ───────────────────────────────────────────────────────────
export async function saveThemeSettings(data: FormData) {
  await requireAdmin();
  const existing = await prisma.systemSettings.findFirst();

  const allianceName = data.has("allianceName") ? data.get("allianceName") as string : existing?.allianceName || "Alliance";
  const logoUrl = data.has("logoUrl") ? (data.get("logoUrl") as string || null) : existing?.logoUrl || null;
  const colorPrimary = data.has("colorPrimary") ? data.get("colorPrimary") as string : existing?.colorPrimary || "#2c3e50";
  const colorAccent = data.has("colorAccent") ? data.get("colorAccent") as string : existing?.colorAccent || "#27ae60";
  const colorBg = data.has("colorBg") ? data.get("colorBg") as string : existing?.colorBg || "#121212";

  if (existing) {
    await prisma.systemSettings.update({
      where: { id: existing.id },
      data: { allianceName, logoUrl, colorPrimary, colorAccent, colorBg },
    });
  } else {
    await prisma.systemSettings.create({
      data: { allianceName, logoUrl, colorPrimary, colorAccent, colorBg, apiSyncInterval: 60 },
    });
  }
  revalidatePath("/", "layout");
}

export async function saveSyncSettings(data: FormData) {
  await requireAllianceLeader();
  const existing = await prisma.systemSettings.findFirst();
  const apiSyncInterval = parseInt(data.get("apiSyncInterval") as string) || existing?.apiSyncInterval || 60;

  if (existing) {
    await prisma.systemSettings.update({
      where: { id: existing.id },
      data: { apiSyncInterval },
    });
  } else {
    await prisma.systemSettings.create({
      data: { apiSyncInterval, allianceName: "Alliance", colorPrimary: "#2c3e50", colorAccent: "#27ae60", colorBg: "#121212" },
    });
  }
  revalidatePath("/", "layout");
}

// ── User Management ──────────────────────────────────────────────────────────
export async function changeUserRole(userId: string, role: string) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { role: role as any },
  });
  revalidatePath("/admin");
}

/**
 * Updates the collection of guilds a user is allowed to manage.
 */
export async function updateUserManagedGuilds(userId: string, guildIds: string[]) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: {
      managedGuilds: {
        set: guildIds.map(id => ({ id }))
      }
    },
  });
  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPassword },
  });
  revalidatePath("/admin");
}

export async function unlinkUserGw2(userId: string) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { memberId: null },
  });
  revalidatePath("/admin");
}

// ── Guild Management ─────────────────────────────────────────────────────────

// Step 1: resolve which guilds a leader token has access to
export async function resolveGuildsFromToken(leaderToken: string) {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session) throw new Error("Nicht eingeloggt");
  const user = session.user;
  if (user.role !== "ADMIN" && user.role !== "ALLIANCE_LEADER" && user.role !== "GUILD_LEADER") {
    throw new Error("Nicht autorisiert");
  }


  const accountRes = await fetch(
    `https://api.guildwars2.com/v2/account?access_token=${leaderToken}`
  );
  if (!accountRes.ok) {
    const errText = await accountRes.text();
    throw new Error(`Ungültiger API Key oder fehlende Berechtigung (benötigt: account, wvw, guilds). GW2: ${errText}`);
  }
  const account = await accountRes.json();

  // GW2 API uses "guild_leader" (NOT "leader_guilds")
  const leaderGuildIds: string[] = account.guild_leader || [];

  if (leaderGuildIds.length === 0) {
    // Provide a helpful error with what scopes/guilds we actually see
    const allGuilds = account.guilds || [];
    throw new Error(
      `Keine Guild-Leader-Rechte gefunden. ` +
      `Dein Account ist Mitglied von ${allGuilds.length} Gilde(n), aber Leader von keiner. ` +
      `Stelle sicher dass der API Key die Berechtigung "guilds" hat.`
    );
  }

  // Fetch details for all leader guilds in parallel
  const guildDetails = await Promise.all(
    leaderGuildIds.map(async (guildId: string) => {
      const res = await fetch(
        `https://api.guildwars2.com/v2/guild/${guildId}?access_token=${leaderToken}`
      );
      if (!res.ok) return { id: guildId, name: `Gilde ${guildId.slice(0, 8)}…`, tag: "???" };
      return res.json() as Promise<{ id: string; name: string; tag: string }>;
    })
  );


  return guildDetails;
}

// ==========================================
// ROLE MANAGEMENT
// ==========================================

export async function addManualRole(data: FormData) {
  await requireAdmin();
  const name = data.get("name") as string;
  const color = data.get("color") as string;

  if (!name) throw new Error("Name ist erforderlich");

  try {
    await prisma.manualRole.create({
      data: { name, color: color || "#ffffff" }
    });
    revalidatePath("/admin", "layout");
    revalidatePath("/members", "layout");
  } catch (e) {
    throw new Error("Rolle extistiert bereits oder Fehler beim Erstellen");
  }
}

export async function deleteManualRole(data: FormData) {
  await requireAdmin();
  const id = data.get("id") as string;
  if (!id) return;

  await prisma.manualRole.delete({ where: { id } });
  revalidatePath("/admin", "layout");
  revalidatePath("/members", "layout");
}

export async function createManualUser(data: FormData) {
  await requireAdmin();
  const email = data.get("email") as string;
  const password = data.get("password") as string;
  const name = data.get("name") as string;
  const role = data.get("role") as any;

  if (!email || !password) throw new Error("Email und Passwort sind erforderlich");

  await prisma.user.create({
    data: {
      email,
      passwordHash: password, // In prod use bcrypt
      name: name || null,
      role: role || "WEB_MEMBER",
    }
  });

  revalidatePath("/admin");
}

export async function addGuild(data: FormData) {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session) throw new Error("Nicht eingeloggt");
  const user = session.user;

  const isHigherStaff = user.role === "ADMIN" || user.role === "ALLIANCE_LEADER";
  const isGuildLeader = user.role === "GUILD_LEADER";


  if (!isHigherStaff && !isGuildLeader) {
    throw new Error("Nicht autorisiert");
  }

  const leaderToken = data.get("leaderToken") as string;
  const isAllianceGuild = isHigherStaff ? (data.get("isAllianceGuild") === "true") : false;

  // 1. Fetch guild info from GW2 API using the leader token
  const accountRes = await fetch(
    `https://api.guildwars2.com/v2/account?access_token=${leaderToken}`
  );
  if (!accountRes.ok) {
    throw new Error("Ungültiger Leader API Key");
  }
  const account = await accountRes.json();
  const leaderGuilds: string[] = account.guild_leader || [];
  if (leaderGuilds.length === 0) {
    throw new Error("Dieser Account ist in keiner Gilde Guild Leader");
  }

  const customGuildId = (data.get("guildId") as string)?.trim();
  const guildId = customGuildId || leaderGuilds[0];

  // 2. Fetch guild details
  const guildRes = await fetch(
    `https://api.guildwars2.com/v2/guild/${guildId}?access_token=${leaderToken}`
  );
  if (!guildRes.ok) {
    throw new Error(`Gilde ${guildId} konnte nicht abgefragt werden`);
  }
  const guildData = await guildRes.json();

  // 3. Upsert guild
  await prisma.guild.upsert({
    where: { id: guildId },
    update: { name: guildData.name, tag: guildData.tag, leaderToken, isAllianceGuild },
    create: {
      id: guildId,
      name: guildData.name,
      tag: guildData.tag,
      leaderToken,
      isAllianceGuild,
    },
  });

  // Assign to leader if it's a self-registration
  if (isGuildLeader) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        managedGuilds: {
          connect: { id: guildId }
        }
      },
    });

  }

  revalidatePath("/admin");
  revalidatePath("/guilds");
}

export async function toggleAllianceGuild(guildId: string, status: boolean) {
  await requireAllianceLeader();
  await prisma.guild.update({
    where: { id: guildId },
    data: { isAllianceGuild: status }
  });
  revalidatePath("/admin");
  revalidatePath("/guilds");
}

export async function deleteGuild(guildId: string) {
  await requireAllianceLeader();
  // Members in this guild → remove guild link, mark INACTIVE
  await prisma.member.updateMany({
    where: { guildId },
    data: { guildId: null, status: "INACTIVE_LEFT" },
  });
  await prisma.guild.delete({ where: { id: guildId } });
  revalidatePath("/admin");
  revalidatePath("/guilds");
}

export async function updateGuildToken(guildId: string, leaderToken: string) {
  await requireGuildPermission(guildId);
  await prisma.guild.update({
    where: { id: guildId },
    data: { leaderToken },
  });
  revalidatePath("/admin");
}

export async function triggerSync() {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session) throw new Error("Nicht eingeloggt");
  const user = session.user;

  const { syncAllGuildRosters } = await import("@/lib/gw2api");

  const isStaff = user.role === "ADMIN" || user.role === "ALLIANCE_LEADER";
  const ids = user.subGuildIds || [];

  if (isStaff || (user.role === "GUILD_LEADER" && ids.length > 0)) {
    const logs = await syncAllGuildRosters();
    revalidatePath("/");
    revalidatePath("/admin");
    return logs;
  }

  throw new Error("Nicht autorisiert");
}
