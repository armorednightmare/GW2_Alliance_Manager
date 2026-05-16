export const dynamic = 'force-dynamic';
import { saveThemeSettings, saveSyncSettings, saveBackupSettings } from "./actions";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/firebase-admin";
import UserManagementClient from "./UserManagementClient";
import GuildManagementClient from "./GuildManagementClient";
import RoleManagementClient from "./RoleManagementClient";
import ImportManagementClient from "./ImportManagementClient";
import BackupManagementClient from "./BackupManagementClient";
import { getBackupList } from "./actions";
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
  const settings = settingsSnapshot.exists ? settingsSnapshot.data() : null;

  const allianceGuildSnapshot = await db.collection("guilds").where("isAllianceGuild", "==", true).limit(1).get();
  const allianceGuild = allianceGuildSnapshot.empty ? null : allianceGuildSnapshot.docs[0].data();
  const defaultAllianceName = allianceGuild ? `${allianceGuild.name} [${allianceGuild.tag}]` : "Allianz Manager";
  
  // Users: only for Higher Staff
  let users: any[] = [];
  if (isHigherStaff(user)) {
    const usersSnapshot = await db.collection("users").orderBy("createdAt", "desc").get();
    users = await Promise.all(usersSnapshot.docs.map(async (doc) => {
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
  }

  // Full Guild list for User Management dropdowns
  const allGuildsSnapshot = await db.collection("guilds").orderBy("name", "asc").get();
  const allGuilds = allGuildsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    };
  });

  // Guilds: Filtered for the current user's view in Guild Management
  const subGuildIds = user.subGuildIds || [];
  let guilds = allGuilds;
  if (!isHigherStaff(user)) {
    guilds = allGuilds.filter(g => subGuildIds.includes(g.id));
  }

  // Roles: only for Higher Staff
  const manualRoles = isHigherStaff(user)
    ? (await db.collection("roles").orderBy("name", "asc").get()).docs.map(doc => ({ id: doc.id, ...doc.data() }))
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
            <UserManagementClient users={sanitizeData(users)} guilds={sanitizeData(allGuilds)} />
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
          <GuildManagementClient guilds={sanitizeData(guilds)} session={sanitizeData(session)} />

          {/* Global settings only for Higher Staff */}
          {isHigherStaff(user) && (
            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <form action={saveSyncSettings} style={{ padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>⚙️ Background Auto-Sync</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>
                  <strong>Letzter erfolgreicher Sync:</strong> {settings?.lastSync?.toDate ? settings.lastSync.toDate().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : 'Noch nie'}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
                  <select 
                    name="apiSyncInterval" 
                    defaultValue={settings?.apiSyncInterval || 10}
                    style={{ 
                      padding: "0.4rem 0.6rem", 
                      background: "#1a1a1a", 
                      color: "white", 
                      border: "1px solid rgba(255,255,255,0.2)", 
                      borderRadius: "4px",
                      colorScheme: "dark"
                    }}
                  >
                    <option value="10">Alle 10 Minuten (Standard)</option>
                    <option value="20">Alle 20 Minuten</option>
                    <option value="30">Alle 30 Minuten</option>
                    <option value="60">Alle 1 Stunde</option>
                    <option value="120">Alle 2 Stunden</option>
                    <option value="240">Alle 4 Stunden</option>
                    <option value="480">Alle 8 Stunden</option>
                    <option value="720">Alle 12 Stunden</option>
                    <option value="1440">Alle 24 Stunden</option>
                  </select>
                  <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>Mindest-Abstand zwischen Roster-Syncs</span>
                </div>
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
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
                <button type="submit" className="btn-primary" style={{ marginTop: "1.5rem", padding: "0.5rem 1.5rem" }}>Einstellungen Speichern</button>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.75rem", opacity: 0.6 }}>
                  Hinweis: Der Cloud Scheduler muss auf mindestens das gleiche Intervall (z.B. <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 4px", borderRadius: "3px" }}>*/10 * * * *</code>) eingestellt sein.
                </p>
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
                      style={{ 
                        padding: "0.4rem 0.6rem", 
                        background: "#1a1a1a", 
                        color: "white", 
                        border: "1px solid rgba(255,255,255,0.2)", 
                        borderRadius: "4px",
                        colorScheme: "dark"
                      }}
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
              <BackupManagementClient initialBackups={sanitizeData(initialBackups)} backupEmail={settings?.backupEmail} />
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
          <RoleManagementClient roles={sanitizeData(manualRoles)} />
        </div>
      )}
    </div>
  );
}
