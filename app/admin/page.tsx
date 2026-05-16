export const dynamic = 'force-dynamic';
import { saveThemeSettings, saveSyncSettings, saveBackupSettings } from "./actions";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserManagementClient from "./UserManagementClient";
import GuildManagementClient from "./GuildManagementClient";
import RoleManagementClient from "./RoleManagementClient";
import ImportManagementClient from "./ImportManagementClient";
import BackupManagementClient from "./BackupManagementClient";
import { getBackupList } from "./actions";
import { canManageUsers, canManageGuilds, canEditTheme, isHigherStaff } from "@/lib/permissions";

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
  const settings = await prisma.systemSettings.findFirst();
  const allianceGuild = await prisma.guild.findFirst({ where: { isAllianceGuild: true } });
  const defaultAllianceName = allianceGuild ? `${allianceGuild.name} [${allianceGuild.tag}]` : "Allianz Manager";
  
  // Users: only for Higher Staff
  const users = isHigherStaff(user) 
    ? await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: { 
          member: { select: { accountName: true } },
          managedGuilds: { select: { id: true } }
        },
      })
    : [];

  // Full Guild list for User Management dropdowns
  const allGuilds = await prisma.guild.findMany({
    orderBy: { name: "asc" }
  });

  // Guilds: Filtered for the current user's view in Guild Management
  const subGuildIds = user.subGuildIds || [];
  const guildWhere = isHigherStaff(user) ? {} : { id: { in: subGuildIds } };
  const guilds = await prisma.guild.findMany({ 
    where: (guildWhere as any),
    orderBy: { name: "asc" } 
  });

  // Roles: only for Higher Staff
  const manualRoles = isHigherStaff(user)
    ? await prisma.manualRole.findMany({ orderBy: { name: "asc" } })
    : [];

  const initialBackups = user.role === "ADMIN" ? await getBackupList() : [];

  return (
    <div>
      <h1>Admin Panel {user.role === "GUILD_LEADER" && "(Eingeschränkt)"}</h1>
      {user.role === "GUILD_LEADER" && (
        <p style={{ opacity: 0.7, marginBottom: "2rem" }}>
          Du verwaltest exklusiv deine zugewiesenen Gilden ({guilds.length}).
        </p>
      )}

      {/* ── User Management (Higher Staff only) ── */}
      {canManageUsers(user) && (
        <>
          <div style={PANEL_STYLE}>
            <h2 style={{ margin: "0 0 0.5rem 0" }}>👥 User Verwaltung</h2>
            <UserManagementClient users={users} guilds={allGuilds} />
          </div>

          <div style={PANEL_STYLE}>
            <h2 style={{ margin: "0 0 0.5rem 0" }}>📦 Daten Import (Excel)</h2>
            <p style={{ opacity: 0.7, margin: "0 0 1rem 0", fontSize: "0.9rem" }}>
              Lade eine Excel-Datei hoch, um Mitglieder-Daten (Rang, Join-Datum, Discord-Name, Kommentar) massenweise zu aktualisieren oder anzulegen.
            </p>
            <ImportManagementClient />
          </div>
        </>
      )}

      {/* ── Guild Management (Admins & Guild Leaders) ── */}
      {canManageGuilds(user) && (
        <div style={PANEL_STYLE}>
          <h2 style={{ margin: "0 0 0.5rem 0" }}>🏰 Gilden & Sync</h2>
          <p style={{ opacity: 0.7, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>
            {user.role === "GUILD_LEADER" 
              ? "Verwalte die API-Keys deiner Gilden und starte manuelle Synchronisationen."
              : "Gilden mit Leader API Key hinterlegen und einen manuellen Roster-Sync auslösen."
            }
          </p>
          <GuildManagementClient guilds={guilds} session={session} />

          {/* Global settings only for Higher Staff */}
          {isHigherStaff(user) && (
            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <form action={saveSyncSettings}>
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>⚙️ Background Auto-Sync</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <input 
                      type="number" 
                      name="apiSyncInterval" 
                      defaultValue={settings?.apiSyncInterval || 60} 
                      min={5} max={1440}
                      style={{ width: "80px", padding: "0.4rem 0.6rem", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px" }} 
                    />
                    <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>Auto-Sync Intervall (Minuten)</span>
                  </div>
                  
                  <div style={{ marginTop: "0.5rem", paddingTop: "1rem", borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        name="allowGuildLeadersToEditRecruits" 
                        value="true" 
                        defaultChecked={settings?.allowGuildLeadersToEditRecruits === true} 
                      />
                      <span>Gildenleiter dürfen Rekruten (StartingRole) der Allianz bearbeiten</span>
                    </label>
                    <p style={{ margin: "0.5rem 0 0 1.5rem", fontSize: "0.8rem", opacity: 0.7 }}>
                      Erlaubt es regionalen Leitern, Profile von Mitgliedern anzupassen, die aktuell den Standard-Rang in der Hauptgilde haben.
                    </p>
                  </div>
                  
                  <button type="submit" className="btn-primary" style={{ width: "fit-content", padding: "0.5rem 2rem" }}>Sync-Einstellungen Speichern</button>
                </div>
              </form>
            </div>
          )}

          {/* Backup settings only for ADMIN */}
          {user.role === "ADMIN" && (
            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <form action={saveBackupSettings}>
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>💾 Datenbank Backup (Google Drive)</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <select 
                      name="backupCronSchedule" 
                      defaultValue={settings?.backupCronSchedule || "0 3 * * 0"}
                      style={{ padding: "0.4rem 0.6rem", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px" }}
                    >
                      <option value="DISABLED">Deaktiviert</option>
                      <option value="0 3 * * *">Täglich (03:00 Uhr)</option>
                      <option value="0 3 * * 0">Wöchentlich, Sonntags (03:00 Uhr)</option>
                      <option value="0 3 1 * *">Monatlich, am 1. (03:00 Uhr)</option>
                    </select>
                    <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>Wann sollen automatische Backups erstellt werden?</span>
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: "fit-content", padding: "0.5rem 2rem" }}>Backup-Plan Speichern</button>
                </div>
              </form>
              <BackupManagementClient initialBackups={initialBackups} backupEmail={settings?.backupEmail} />
            </div>
          )}
        </div>
      )}

      {/* ── Theme Settings (Admin only) ── */}
      {canEditTheme(user) && (
        <div style={PANEL_STYLE}>
          <h2 style={{ marginTop: 0 }}>🎨 Theme &amp; Layout</h2>
          <form action={saveThemeSettings} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "420px", marginTop: "1rem" }}>
             <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem" }}>Allianz Name</label>
              <input 
                name="allianceName" 
                defaultValue={settings?.allianceName || ""} 
                placeholder={defaultAllianceName}
                style={{ width: "100%", padding: "0.5rem", background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px" }} 
              />
              {!settings?.allianceName && (
                <p style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.3rem" }}>
                  Aktueller Fallback: <strong>{defaultAllianceName}</strong>
                </p>
              )}
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem" }}>Allianz Logo URL</label>
              <input name="logoUrl" defaultValue={settings?.logoUrl || ""} style={{ width: "100%", padding: "0.5rem", background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px" }} />
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div><label>Primär</label><input type="color" name="colorPrimary" defaultValue={settings?.colorPrimary || "#2c3e50"} /></div>
              <div><label>Akzent</label><input type="color" name="colorAccent" defaultValue={settings?.colorAccent || "#27ae60"} /></div>
              <div><label>Hintergrund</label><input type="color" name="colorBg" defaultValue={settings?.colorBg || "#121212"} /></div>
            </div>
            <button type="submit" className="btn-primary">Speichern</button>
          </form>
          <RoleManagementClient roles={manualRoles} />
        </div>
      )}
    </div>
  );
}
