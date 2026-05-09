import "dotenv/config";
import { db } from "../lib/firebase-admin";
import { Client } from "pg";

/**
 * MIGRATIONS-SKRIPT: Railway (PostgreSQL) -> Firebase (Firestore)
 */

async function migrate() {
  const pgUrl = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL;
  
  if (!pgUrl) {
    console.error("❌ Keine DATABASE_URL gefunden.");
    process.exit(1);
  }

  console.log("🔗 Verbinde mit PostgreSQL...");
  const pg = new Client({ connectionString: pgUrl });
  await pg.connect();

  try {
    // --- 1. Gilden migrieren ---
    console.log("🏰 Migriere Gilden...");
    const guildsRes = await pg.query('SELECT * FROM "Guild"');
    for (const g of guildsRes.rows) {
      await db.collection("guilds").doc(g.id).set({
        name: g.name,
        tag: g.tag,
        leaderToken: g.leaderToken, // Korrigierter Name
        isAllianceGuild: g.isAllianceGuild,
        isManual: g.isManual,
        publicRanks: g.publicRanks,
        createdAt: g.createdAt || new Date()
      });
    }

    // --- 2. Mitglieder migrieren ---
    console.log("👤 Migriere Mitglieder...");
    const membersRes = await pg.query('SELECT * FROM "Member"');
    
    const ranksRes = await pg.query('SELECT * FROM "MemberGuild"');
    console.log(`📊 Gefundene Gilden-Mitgliedschaften (Ränge): ${ranksRes.rows.length}`);
    const memberRanksMap: Record<string, any[]> = {};
    ranksRes.rows.forEach(r => {
      if (!memberRanksMap[r.memberId]) memberRanksMap[r.memberId] = [];
      const guildInfo = guildsRes.rows.find(g => g.id === r.guildId);
      memberRanksMap[r.memberId].push({
        id: r.guildId, // Flat ID
        name: guildInfo?.name || "Unbekannt", // Flat Name
        tag: guildInfo?.tag || "???", // Flat Tag
        isAllianceGuild: guildInfo?.isAllianceGuild || false,
        isManual: guildInfo?.isManual || false,
        guild: { // Also keep nested for components that expect it
          id: r.guildId,
          name: guildInfo?.name || "Unbekannt",
          tag: guildInfo?.tag || "???",
          isAllianceGuild: guildInfo?.isAllianceGuild || false,
          isManual: guildInfo?.isManual || false
        },
        rank: r.rank
      });
    });

    for (const m of membersRes.rows) {
      const guilds = memberRanksMap[m.id] || [];
      await db.collection("members").doc(m.id).set({
        accountName: m.accountName,
        discordId: m.discordId,
        customDiscordName: m.customDiscordName, // Korrigierter Name
        status: m.status,
        wvwMember: m.wvwMember,
        isAllianceMember: m.isAllianceMember,
        comment: m.comment,
        manualRole: m.manualRole,
        invitedBy: m.invitedBy,
        guilds: guilds,
        joinedAt: m.joinedAt,
        lastSeenAt: m.lastSeenAt,
        createdAt: m.createdAt || new Date(),
        updatedAt: m.updatedAt || new Date()
      });
    }

    // --- 3. Historie migrieren ---
    console.log("📜 Migriere Historie...");
    const historyRes = await pg.query('SELECT * FROM "MemberHistory"');
    for (const h of historyRes.rows) {
      const memberExists = (await db.collection("members").doc(h.memberId).get()).exists;
      if (memberExists) {
        await db.collection("members").doc(h.memberId).collection("history").doc(h.id).set({
          eventType: h.eventType,
          oldValue: h.oldValue,
          newValue: h.newValue,
          createdAt: h.createdAt || new Date(),
          timestamp: h.createdAt || new Date(),
          guildId: h.guildId
        });
      }
    }

    // --- 4. Rollen migrieren ---
    console.log("🎭 Migriere Rollen...");
    const rolesRes = await pg.query('SELECT * FROM "ManualRole"');
    for (const r of rolesRes.rows) {
      await db.collection("roles").doc(r.id).set({
        name: r.name,
        color: r.color || "#ffffff"
      });
    }

    // --- 5. Benutzer migrieren ---
    console.log("🔑 Migriere Benutzer...");
    
    // Prisma M2M Join-Tabelle auslesen: A = Guild ID, B = User ID
    const managersRes = await pg.query('SELECT * FROM "_GuildManagers"');
    const userToManagedGuilds: Record<string, string[]> = {};
    for (const row of managersRes.rows) {
       const guildId = row.A;
       const userId = row.B;
       if (!userToManagedGuilds[userId]) userToManagedGuilds[userId] = [];
       userToManagedGuilds[userId].push(guildId);
    }

    const usersRes = await pg.query('SELECT * FROM "User"');
    for (const u of usersRes.rows) {
      await db.collection("users").doc(u.id).set({
        name: u.name,
        email: u.email,
        emailVerified: u.emailVerified || null,
        image: u.image || null,
        passwordHash: u.passwordHash || null, // EXTREM WICHTIG
        role: u.role || "WEB_MEMBER",
        memberId: u.memberId || null,
        discordId: u.discordId || null,
        managedGuildIds: userToManagedGuilds[u.id] || [], // NEU: Fehlende Admin-Panel Haken
        lastLoginAt: u.lastLoginAt || null,
        createdAt: u.createdAt || new Date()
      });
    }

    // --- 5. System Settings ---
    console.log("⚙️ Migriere System-Settings...");
    const settingsRes = await pg.query('SELECT * FROM "SystemSettings" LIMIT 1');
    if (settingsRes.rows.length > 0) {
      const s = settingsRes.rows[0];
      await db.collection("settings").doc("system").set({
        allianceName: s.allianceName,
        logoUrl: s.logoUrl,
        colorPrimary: s.colorPrimary,
        colorAccent: s.colorAccent,
        colorBg: s.colorBg,
        apiSyncInterval: s.apiSyncInterval,
        backupCronSchedule: s.backupCronSchedule,
        backupRefreshToken: s.backupRefreshToken,
        backupEmail: s.backupEmail
      });
    }

    console.log("\n🎉 MIGRATION ERFOLGREICH ABGESCHLOSSEN!");

  } catch (error) {
    console.error("❌ Fehler bei der Migration:", error);
  } finally {
    await pg.end();
  }
}

migrate();
