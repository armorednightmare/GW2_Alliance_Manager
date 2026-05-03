"use server";
import { db } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { runDatabaseBackup, getGoogleDriveClient } from "@/lib/backup";

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
  const settingsRef = db.collection("settings").doc("system");
  const doc = await settingsRef.get();
  const existing = doc.exists ? doc.data() : null;

  const allianceName = data.has("allianceName") ? data.get("allianceName") as string : existing?.allianceName || "Alliance";
  const logoUrl = data.has("logoUrl") ? (data.get("logoUrl") as string || null) : existing?.logoUrl || null;
  const colorPrimary = data.has("colorPrimary") ? data.get("colorPrimary") as string : existing?.colorPrimary || "#2c3e50";
  const colorAccent = data.has("colorAccent") ? data.get("colorAccent") as string : existing?.colorAccent || "#27ae60";
  const colorBg = data.has("colorBg") ? data.get("colorBg") as string : existing?.colorBg || "#121212";

  await settingsRef.set({
    ...existing,
    allianceName, logoUrl, colorPrimary, colorAccent, colorBg
  }, { merge: true });

  revalidatePath("/", "layout");
}

export async function saveSyncSettings(data: FormData) {
  await requireAllianceLeader();
  const settingsRef = db.collection("settings").doc("system");
  const doc = await settingsRef.get();
  const existing = doc.exists ? doc.data() : null;

  const apiSyncInterval = parseInt(data.get("apiSyncInterval") as string) || existing?.apiSyncInterval || 60;

  await settingsRef.set({
    ...existing,
    apiSyncInterval,
    allianceName: existing?.allianceName || "Alliance",
    colorPrimary: existing?.colorPrimary || "#2c3e50",
    colorAccent: existing?.colorAccent || "#27ae60",
    colorBg: existing?.colorBg || "#121212"
  }, { merge: true });

  revalidatePath("/", "layout");
}

export async function saveBackupSettings(data: FormData) {
  await requireAdmin();
  const settingsRef = db.collection("settings").doc("system");
  const doc = await settingsRef.get();
  const existing = doc.exists ? doc.data() : null;

  const backupCronSchedule = (data.get("backupCronSchedule") as string) || "0 3 * * 0";

  await settingsRef.set({
    ...existing,
    backupCronSchedule,
    allianceName: existing?.allianceName || "Alliance"
  }, { merge: true });

  revalidatePath("/admin");
}

export async function triggerManualBackup() {
  await requireAdmin();
  try {
    await runDatabaseBackup();
    revalidatePath("/admin");
    return { success: true };
  } catch (e: any) {
    throw new Error(`Backup fehlgeschlagen: ${e.message}`);
  }
}

export async function getBackupList() {
  await requireAdmin();
  try {
    const { drive, targetFolderId } = await getGoogleDriveClient();
    const res = await drive.files.list({
      q: `'${targetFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, size, createdTime)',
      orderBy: 'createdTime desc'
    });
    
    // Map and filter to ensure strict types for the client
    return (res.data.files || [])
      .filter(file => file.id && file.name && file.createdTime)
      .map(file => ({
        id: file.id as string,
        name: file.name as string,
        size: file.size || "0",
        createdTime: file.createdTime as string
      }));
  } catch (e: any) {
    console.error("Fehler beim Laden der Backups:", e.message);
    return [];
  }
}

export async function unlinkBackupAccount() {
  await requireAdmin();
  const settingsRef = db.collection("settings").doc("system");
  await settingsRef.update({
    backupRefreshToken: null,
    backupEmail: null,
  });
  revalidatePath("/admin");
}

// ── User Management ──────────────────────────────────────────────────────────
export async function changeUserRole(userId: string, role: string) {
  await requireAdmin();
  await db.collection("users").doc(userId).update({
    role: role
  });
  revalidatePath("/admin");
}

/**
 * Updates the collection of guilds a user is allowed to manage.
 */
export async function updateUserManagedGuilds(userId: string, guildIds: string[]) {
  await requireAdmin();
  await db.collection("users").doc(userId).update({
    managedGuildIds: guildIds
  });
  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  await requireAdmin();
  await db.collection("users").doc(userId).delete();
  revalidatePath("/admin");
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireAdmin();
  await db.collection("users").doc(userId).update({
    passwordHash: newPassword
  });
  revalidatePath("/admin");
}

export async function unlinkUserGw2(userId: string) {
  await requireAdmin();
  await db.collection("users").doc(userId).update({
    memberId: null
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
    const id = name.toLowerCase().replace(/\s+/g, "-");
    await db.collection("roles").doc(id).set({
      name,
      color: color || "#ffffff"
    });
    revalidatePath("/admin", "layout");
    revalidatePath("/members", "layout");
  } catch (e) {
    throw new Error("Fehler beim Erstellen der Rolle");
  }
}

export async function deleteManualRole(data: FormData) {
  await requireAdmin();
  const id = data.get("id") as string;
  if (!id) return;

  await db.collection("roles").doc(id).delete();
  revalidatePath("/admin", "layout");
  revalidatePath("/members", "layout");
}

export async function createManualUser(data: FormData) {
  await requireAdmin();
  const username = data.get("username") as string;
  const password = data.get("password") as string;
  const role = data.get("role") as any;

  if (!username || !password) throw new Error("Benutzername und Passwort sind erforderlich");

  const existing = await db.collection("users").where("name", "==", username).limit(1).get();
  if (!existing.empty) throw new Error("Dieser Benutzername existiert bereits");

  await db.collection("users").add({
    name: username,
    passwordHash: password, // In prod use bcrypt
    role: role || "WEB_MEMBER",
    createdAt: new Date()
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
  await db.collection("guilds").doc(guildId).set({
    name: guildData.name,
    tag: guildData.tag,
    leaderToken,
    isAllianceGuild,
    updatedAt: new Date()
  }, { merge: true });

  // Assign to leader if it's a self-registration
  if (isGuildLeader) {
    const userRef = db.collection("users").doc(user.id);
    const userDoc = await userRef.get();
    const managedGuildIds = userDoc.exists ? (userDoc.data()?.managedGuildIds || []) : [];
    if (!managedGuildIds.includes(guildId)) {
      await userRef.update({
        managedGuildIds: [...managedGuildIds, guildId]
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/guilds");
}

export async function addManualGuild(data: FormData) {
  await requireAllianceLeader();

  const name = data.get("name") as string;
  const tag = data.get("tag") as string;
  const isAllianceGuild = data.get("isAllianceGuild") === "true";

  if (!name || !tag) {
    throw new Error("Name und Tag sind erforderlich für eine manuelle Gilde.");
  }

  await db.collection("guilds").add({
    name,
    tag,
    isAllianceGuild,
    isManual: true,
    leaderToken: null,
    createdAt: new Date()
  });

  revalidatePath("/admin");
  revalidatePath("/guilds");
}

export async function toggleAllianceGuild(guildId: string, status: boolean) {
  await requireAllianceLeader();
  await db.collection("guilds").doc(guildId).update({
    isAllianceGuild: status
  });
  revalidatePath("/admin");
  revalidatePath("/guilds");
}

export async function deleteGuild(guildId: string) {
  await requireAllianceLeader();

  // 1. Delete the guild
  await db.collection("guilds").doc(guildId).delete();

  // 2. Find and update all members who were in this guild
  // In NoSQL, we look for members where the 'guilds' array contains the guildId
  const snapshot = await db.collection("members").where("guilds", "array-contains", { id: guildId }).get();
  
  const batch = db.batch();
  for (const doc of snapshot.docs) {
    const memberData = doc.data();
    // Filter out the deleted guild from the member's guilds array
    const remainingGuilds = (memberData.guilds || []).filter((g: any) => g.id !== guildId);
    
    const updateData: any = { guilds: remainingGuilds };
    
    // If member has no guilds left, mark as inactive
    if (remainingGuilds.length === 0) {
      updateData.status = "INACTIVE_LEFT";
      updateData.isAllianceMember = false;
      updateData.wvwMember = false;
    }
    
    batch.update(doc.ref, updateData);
  }
  await batch.commit();

  revalidatePath("/admin");
  revalidatePath("/guilds");
}

export async function updateGuildToken(guildId: string, leaderToken: string) {
  await requireGuildPermission(guildId);
  await db.collection("guilds").doc(guildId).update({
    leaderToken: leaderToken
  });
  revalidatePath("/admin");
}

export async function toggleGuildPublicRanks(guildId: string, status: boolean) {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session) throw new Error("Nicht eingeloggt");
  const user = session.user;

  let authorized = false;
  if (user.role === "ADMIN") {
    authorized = true;
  } else if ((user.subGuildIds || []).includes(guildId)) {
    authorized = true;
  }

  if (!authorized) {
    throw new Error("Keine Berechtigung, diese Einstellung zu ändern. Nur Admins oder Gildenleiter dieser Gilde dürfen dies tun.");
  }

  await db.collection("guilds").doc(guildId).update({
    publicRanks: status
  });
  revalidatePath("/admin");
  revalidatePath("/members");
  revalidatePath(`/members/[id]`, "page");
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

// ── Member Import (Excel) ───────────────────────────────────────────────────

export async function getImportHeaders(formData: FormData) {
  const session = await requireAllianceLeader();
  const file = formData.get("file") as File;
  if (!file) throw new Error("Keine Datei hochgeladen");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const xlsx = await import("xlsx");
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Get only first row for performance
  const rows = xlsx.utils.sheet_to_json(sheet, { range: 0 }) as any[];
  if (rows.length === 0) return [];
  
  return Object.keys(rows[0]);
}

export async function analyzeMemberImport(formData: FormData, manualMapping?: Record<string, string>) {
  const session = await requireAllianceLeader();
  const file = formData.get("file") as File;
  if (!file) throw new Error("Keine Datei hochgeladen");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const xlsx = await import("xlsx");
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet) as any[];

  const preview = [];
  
  // Find Alliance Guild ("Frog") for rank comparison
  const guildSnapshot = await db.collection("guilds").where("isAllianceGuild", "==", true).limit(1).get();
  const allianceGuild = guildSnapshot.empty ? null : { id: guildSnapshot.docs[0].id, ...guildSnapshot.docs[0].data() } as any;

  for (const row of rows) {
    const findValue = (keys: string[], fieldKey?: string) => {
      // If manual mapping is provided, it is the SOURCE OF TRUTH.
      // If a fieldKey is NOT in the mapping, it means it's disabled or not mapped.
      if (manualMapping) {
        if (fieldKey && manualMapping[fieldKey]) {
          return row[manualMapping[fieldKey]] ?? null;
        }
        return null; // Explicitly disabled or not mapped
      }

      // Otherwise fallback to fuzzy logic (only used if no manual mapping provided at all)
      const foundKey = Object.keys(row).find(k => keys.some(alt => k.toLowerCase().includes(alt.toLowerCase())));
      return foundKey ? row[foundKey] : null;
    };

    const accountName = (findValue(["Accountname", "Account Name", "Account-Name", "Account ID", "Account-ID"], "accountName") || findValue(["Account"]))?.toString().trim();
    if (!accountName) continue;

    const excelData = {
      accountName,
      rank: findValue(["Rolle", "Rang", "Rank", "Role"], "rank")?.toString().trim() || "",
      joinedAt: findValue(["Beitritt", "Datum Join", "Join Date", "Mitglied seit", "Eintritt", "Join"], "joinedAt"),
      discordName: findValue(["Discordname", "Discord Name", "Discord Tag", "Discord"], "discordName")?.toString().trim() || "",
      guildName: findValue(["Gildenzugehörigkeit", "Gilde", "Guild"], "guildName")?.toString().trim() || "",
      comment: findValue(["Info", "Kommentar", "Notiz", "Comment", "Note"], "comment")?.toString().trim() || ""
    };

    // Special handling for [keine Zugehörigkeit]
    if (excelData.guildName?.toLowerCase().includes("keine zugehörigkeit")) {
      excelData.guildName = "";
    }

    const memberSnapshot = await db.collection("members").where("accountName", "==", accountName).limit(1).get();
    const existingDoc = memberSnapshot.empty ? null : memberSnapshot.docs[0];
    const existing = existingDoc ? existingDoc.data() : null;

    let status: "NEW" | "UPDATE" | "CONFLICT" = "NEW";
    const conflicts: string[] = [];
    const updates: string[] = [];
    
    // Default diff structure
    const diff: any = {
      rank: { old: "", new: excelData.rank, isChanged: !!excelData.rank },
      joinedAt: { old: "", new: excelData.joinedAt, isChanged: !!excelData.joinedAt },
      discordName: { old: "", new: excelData.discordName, isChanged: !!excelData.discordName },
      guildName: { old: "", new: excelData.guildName, isChanged: !!excelData.guildName },
      comment: { old: "", new: excelData.comment, isChanged: !!excelData.comment },
    };

    if (existing) {
      status = "UPDATE";
      
      // Helper for robust string comparison
      const isSame = (a: string | null | undefined, b: string | null | undefined, caseInsensitive = false) => {
        const valA = (a || "").trim();
        const valB = (b || "").trim();
        if (caseInsensitive) return valA.toLowerCase() === valB.toLowerCase();
        return valA === valB;
      };

      // 1. Rank (Alliance Guild specifically)
      const allianceMembership = (existing.guilds || []).find((mg: any) => mg.id === allianceGuild?.id);
      const oldRank = allianceMembership?.rank || "";
      
      if (excelData.rank && !isSame(oldRank, excelData.rank, true)) {
        if (oldRank) {
          status = "CONFLICT";
          conflicts.push(`Rang: DB(${oldRank}) vs Excel(${excelData.rank})`);
          diff.rank = { old: oldRank, new: excelData.rank, isChanged: true, conflict: true };
        } else {
          updates.push(`Rang: ${excelData.rank} setzen`);
          diff.rank = { old: oldRank, new: excelData.rank, isChanged: true };
        }
      } else {
        diff.rank = { old: oldRank, new: oldRank, isChanged: false };
      }

      // 2. Comment
      const oldComment = existing.comment || "";
      if (excelData.comment && !isSame(oldComment, excelData.comment)) {
        if (oldComment) {
          status = "CONFLICT";
          conflicts.push(`Kommentar: DB unterscheidet sich`);
          diff.comment = { old: oldComment, new: excelData.comment, isChanged: true, conflict: true };
        } else {
          updates.push("Kommentar hinzufügen");
          diff.comment = { old: oldComment, new: excelData.comment, isChanged: true };
        }
      } else {
        diff.comment = { old: oldComment, new: oldComment, isChanged: false };
      }

      // 3. Discord
      const oldDiscord = existing.customDiscordName || "";
      if (excelData.discordName && !isSame(oldDiscord, excelData.discordName)) {
        if (oldDiscord) {
          status = "CONFLICT";
          conflicts.push(`Discord: DB(${oldDiscord}) vs Excel(${excelData.discordName})`);
          diff.discordName = { old: oldDiscord, new: excelData.discordName, isChanged: true, conflict: true };
        } else {
          updates.push("Discord-Name setzen");
          diff.discordName = { old: oldDiscord, new: excelData.discordName, isChanged: true };
        }
      } else {
        diff.discordName = { old: oldDiscord, new: oldDiscord, isChanged: false };
      }

      // 4. JoinedAt
      const oldJoinedAt = existing.joinedAt?.toDate?.()?.toISOString() || existing.joinedAt || "";
      if (excelData.joinedAt) {
        const parsed = parseExcelDate(excelData.joinedAt);
        if (parsed) {
          const existingDate = existing.joinedAt?.toDate?.() || (existing.joinedAt ? new Date(existing.joinedAt) : null);
          const hasJoinedAt = !!existingDate;
          const sameDate = hasJoinedAt && existingDate.getTime() === parsed.getTime();
          if (!sameDate) {
            updates.push("Beitrittsdatum aktualisieren");
            diff.joinedAt = { old: oldJoinedAt, new: parsed.toISOString(), isChanged: true };
          } else {
            diff.joinedAt = { old: oldJoinedAt, new: oldJoinedAt, isChanged: false };
          }
        } else {
          diff.joinedAt = { old: oldJoinedAt, new: oldJoinedAt, isChanged: false };
        }
      } else {
        diff.joinedAt = { old: oldJoinedAt, new: oldJoinedAt, isChanged: false };
      }

      // 5. Secondary Guild (Check ALL memberships)
      const isAlreadyInGuild = existing.guilds.some(mg => 
        isSame(mg.guild.name, excelData.guildName, true) || 
        isSame(mg.guild.tag, excelData.guildName, true)
      );

      if (excelData.guildName && !isAlreadyInGuild) {
        diff.guildName = { old: "", new: excelData.guildName, isChanged: true };
      } else {
        diff.guildName = { old: "", new: excelData.guildName, isChanged: false };
      }
    }

      preview.push({
      accountName,
      status,
      conflicts,
      updates,
      diff,
      excelData, // Keep original data for execution
      existingId: existingDoc?.id || null
    });
  }

  return preview;
}

export async function executeMemberImport(selectedItems: any[], overwriteConflicts: boolean) {
  const session = await requireAllianceLeader();
  const guildSnapshot = await db.collection("guilds").where("isAllianceGuild", "==", true).limit(1).get();
  const allianceGuild = guildSnapshot.empty ? null : { id: guildSnapshot.docs[0].id, ...guildSnapshot.docs[0].data() } as any;

  const results = { created: 0, updated: 0, errors: 0 };

  for (const item of selectedItems) {
    const data = item.excelData;
    const diff = item.diff; // Use pre-calculated diff
    if (!data || !diff) continue;

    try {
      // 1. Prepare Update Data: Only include CHANGED fields
      const updateData: any = {};
      if (diff.comment?.isChanged) updateData.comment = data.comment || null;
      if (diff.discordName?.isChanged) updateData.customDiscordName = data.discordName || null;
      
      // Handle raw date from Excel only if changed
      if (diff.joinedAt?.isChanged) {
        const parsedDate = parseExcelDate(data.joinedAt);
        if (parsedDate) updateData.joinedAt = parsedDate;
      }

      const isNew = !item.existingId;
      const memberRef = isNew ? db.collection("members").doc() : db.collection("members").doc(item.existingId);
      
      const memberDoc = !isNew ? await memberRef.get() : null;
      const existingGuilds = memberDoc?.exists ? (memberDoc.data()?.guilds || []) : [];

      const memberData: any = {
        accountName: item.accountName,
        status: "ACTIVE",
        isAllianceMember: true,
        updatedAt: new Date()
      };

      if (diff.comment?.isChanged) memberData.comment = data.comment || null;
      else if (!isNew) memberData.comment = memberDoc?.data()?.comment || null;

      if (diff.discordName?.isChanged) memberData.customDiscordName = data.discordName || null;
      else if (!isNew) memberData.customDiscordName = memberDoc?.data()?.customDiscordName || null;
      
      if (diff.joinedAt?.isChanged) {
        const parsedDate = parseExcelDate(data.joinedAt);
        if (parsedDate) memberData.joinedAt = parsedDate;
      } else if (!isNew) {
        memberData.joinedAt = memberDoc?.data()?.joinedAt || null;
      }

      // Handle Guilds denormalization
      let updatedGuilds = [...existingGuilds];

      // Alliance Guild update
      if (allianceGuild && (isNew || diff.rank?.isChanged)) {
        const allianceIdx = updatedGuilds.findIndex(g => g.id === allianceGuild.id);
        const allianceEntry = {
          id: allianceGuild.id,
          name: allianceGuild.name,
          tag: allianceGuild.tag,
          rank: data.rank || "Member",
          joinedAt: memberData.joinedAt || new Date()
        };

        if (allianceIdx >= 0) updatedGuilds[allianceIdx] = allianceEntry;
        else updatedGuilds.push(allianceEntry);
      }

      // Secondary Guild update
      if (data.guildName && data.guildName !== allianceGuild?.name && data.guildName !== allianceGuild?.tag) {
        const cleanGuildName = data.guildName.replace(/^\[/, "").replace(/\]$/, "");
        
        const secSnapshot = await db.collection("guilds")
          .where("name", "in", [data.guildName, cleanGuildName])
          .get();
        
        let secondaryGuild = secSnapshot.empty ? null : { id: secSnapshot.docs[0].id, ...secSnapshot.docs[0].data() } as any;
        
        if (!secondaryGuild) {
            const secTagSnapshot = await db.collection("guilds")
                .where("tag", "in", [data.guildName, cleanGuildName])
                .get();
            secondaryGuild = secTagSnapshot.empty ? null : { id: secTagSnapshot.docs[0].id, ...secTagSnapshot.docs[0].data() } as any;
        }

        if (secondaryGuild) {
          const secIdx = updatedGuilds.findIndex(g => g.id === secondaryGuild.id);
          if (secIdx === -1) {
            updatedGuilds.push({
              id: secondaryGuild.id,
              name: secondaryGuild.name,
              tag: secondaryGuild.tag,
              rank: "Member",
              joinedAt: new Date()
            });
          }
        }
      }

      memberData.guilds = updatedGuilds;
      await memberRef.set(memberData, { merge: true });

      if (isNew) results.created++;
      else results.updated++;

      // 4. Detailed History logging: ONLY for changes
      if (isNew) {
        await memberRef.collection("history").add({
          type: "IMPORT",
          description: "Mitglied via Excel importiert",
          timestamp: new Date()
        });
      }

      if (diff.rank?.isChanged) {
        await memberRef.collection("history").add({
          type: "RANK_CHANGE",
          newValue: data.rank,
          oldValue: diff.rank.old || null,
          timestamp: new Date()
        });
      }

      if (diff.discordName?.isChanged) {
        await memberRef.collection("history").add({
          type: "DISCORD_NAME_CHANGED",
          newValue: data.discordName,
          oldValue: diff.discordName.old || null,
          timestamp: new Date()
        });
      }

      if (diff.comment?.isChanged) {
        await memberRef.collection("history").add({
          type: diff.comment.old ? "COMMENT_CHANGED" : "COMMENT_ADDED",
          newValue: data.comment,
          oldValue: diff.comment.old || null,
          timestamp: new Date()
        });
      }

    } catch (e) {
      console.error("Import error for", item.accountName, e);
      results.errors++;
    }
  }

  revalidatePath("/members");
  return results;
}

function parseExcelDate(value: any): Date | null {
  if (!value) return null;
  
  // 1. If it's already a Date object
  if (value instanceof Date) return value;

  // 2. If it's a number (Excel serial date)
  if (typeof value === "number") {
    return new Date((value - (25567 + 1)) * 86400 * 1000);
  }

  // 3. If it's a string, try common formats (including Google Sheets DD.MM.YYYY)
  if (typeof value === "string") {
    const s = value.trim();
    // Try DD.MM.YYYY
    const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dmy) {
      return new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
    }
    // Fallback to standard JS parsing
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}
