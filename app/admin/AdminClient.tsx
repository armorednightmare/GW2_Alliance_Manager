"use client";
import React from "react";
import { useLanguage } from "../components/LanguageContext";
import UserManagementClient from "./UserManagementClient";
import GuildManagementClient from "./GuildManagementClient";
import RoleManagementClient from "./RoleManagementClient";
import ImportManagementClient from "./ImportManagementClient";

const PANEL_STYLE = {
  marginTop: "2rem",
  padding: "1.5rem",
  background: "rgba(0,0,0,0.2)",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.06)",
} as const;

export default function AdminClient({ 
  user, 
  users, 
  guilds, 
  allGuilds, 
  settings, 
  defaultAllianceName, 
  manualRoles, 
  session,
  canManageUsersFlag,
  canManageGuildsFlag,
  canEditThemeFlag,
  isHigherStaffFlag,
  allianceRanks,
  saveSyncSettingsAction,
  saveThemeSettingsAction
}: any) {
  const { t } = useLanguage();

  return (
    <div>
      <h1>{t("adminPanel")} {user.role === "GUILD_LEADER" && t("adminRestricted")}</h1>
      {user.role === "GUILD_LEADER" && (
        <p style={{ opacity: 0.7, marginBottom: "2rem" }}>
          {t("adminGuildLeaderDesc")} ({guilds.length}).
        </p>
      )}

      {/* ── User Management (Higher Staff only) ── */}
      {canManageUsersFlag && (
        <>
          <div style={PANEL_STYLE}>
            <h2 style={{ margin: "0 0 0.5rem 0" }}>{t("adminUserMgmt")}</h2>
            <UserManagementClient users={users} guilds={allGuilds} />
          </div>

          <div style={PANEL_STYLE}>
            <h2 style={{ margin: "0 0 0.5rem 0" }}>{t("adminDataImport")}</h2>
            <p style={{ opacity: 0.7, margin: "0 0 1rem 0", fontSize: "0.9rem" }}>
              {t("adminDataImportDesc")}
            </p>
            <ImportManagementClient />
          </div>
        </>
      )}

      {/* ── Guild Management (Admins & Guild Leaders) ── */}
      {canManageGuildsFlag && (
        <div style={PANEL_STYLE}>
          <h2 style={{ margin: "0 0 0.5rem 0" }}>{t("adminGuildsSync")}</h2>
          <p style={{ opacity: 0.7, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>
            {user.role === "GUILD_LEADER" 
              ? t("adminGuildsSyncLeaderDesc")
              : t("adminGuildsSyncAdminDesc")
            }
          </p>
          <GuildManagementClient guilds={guilds} session={session} />

          {/* Global settings only for Higher Staff */}
          {isHigherStaffFlag && (
            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <form action={saveSyncSettingsAction} style={{ padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>{t("adminAutoSync")}</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>
                  <strong>{t("adminLastSync")}</strong> {settings?.lastSync?.toDate ? settings.lastSync.toDate().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : t("adminNever")}
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
                    <option value="10">{t("adminEvery")} 10 {t("adminMinutes")} ({t("adminDefault")})</option>
                    <option value="20">{t("adminEvery")} 20 {t("adminMinutes")}</option>
                    <option value="30">{t("adminEvery")} 30 {t("adminMinutes")}</option>
                    <option value="60">{t("adminEvery")} 1 {t("adminHour")}</option>
                    <option value="120">{t("adminEvery")} 2 {t("adminHours")}</option>
                    <option value="240">{t("adminEvery")} 4 {t("adminHours")}</option>
                    <option value="480">{t("adminEvery")} 8 {t("adminHours")}</option>
                    <option value="720">{t("adminEvery")} 12 {t("adminHours")}</option>
                    <option value="1440">{t("adminEvery")} 24 {t("adminHours")}</option>
                  </select>
                  <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>{t("adminSyncIntervalDesc")}</span>
                </div>
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>{t("adminAllowRecruitEdit")}</h4>
                  <p style={{ margin: "0 0 1rem 0", fontSize: "0.8rem", opacity: 0.7 }}>
                    {t("adminAllowRecruitEditDesc")}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px" }}>
                    {allianceRanks && allianceRanks.map((rank: string) => (
                      <label key={rank} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
                        <input 
                          type="checkbox" 
                          name="editableAllianceRanks" 
                          value={rank} 
                          defaultChecked={(settings?.editableAllianceRanks || []).includes(rank)} 
                        />
                        <span>{rank}</span>
                      </label>
                    ))}
                    
                    {/* Missing ranks that are still saved but no longer exist in the guild */}
                    {(settings?.editableAllianceRanks || []).map((rank: string) => {
                      if (!allianceRanks || allianceRanks.includes(rank)) return null;
                      return (
                        <label key={`missing-${rank}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", opacity: 0.5, textDecoration: "line-through" }}>
                           <input 
                             type="checkbox" 
                             name="editableAllianceRanks" 
                             value={rank} 
                             defaultChecked={true} 
                           />
                           <span>{rank} (Nicht mehr in Gilde vorhanden) - Haken entfernen zum Löschen</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: "1.5rem", padding: "0.5rem 1.5rem" }}>{t("adminSaveSettings")}</button>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.75rem", opacity: 0.6 }}>
                  {t("adminSchedulerNote")} (z.B. <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 4px", borderRadius: "3px" }}>*/10 * * * *</code>).
                </p>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── Theme Settings (Admin only) ── */}
      {canEditThemeFlag && (
        <div style={PANEL_STYLE}>
          <h2 style={{ marginTop: 0 }}>{t("adminThemeLayout")}</h2>
          <form action={saveThemeSettingsAction} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "420px", marginTop: "1rem" }}>
             <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem" }}>{t("adminAllianceName")}</label>
              <input 
                name="allianceName" 
                defaultValue={settings?.allianceName || ""} 
                placeholder={defaultAllianceName}
                style={{ width: "100%", padding: "0.5rem", background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px" }} 
              />
              {!settings?.allianceName && (
                <p style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.3rem" }}>
                  {t("adminFallback")} <strong>{defaultAllianceName}</strong>
                </p>
              )}
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem" }}>{t("adminLogoUrl")}</label>
              <input name="logoUrl" defaultValue={settings?.logoUrl || ""} style={{ width: "100%", padding: "0.5rem", background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px" }} />
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div><label>{t("adminColorPrimary")}</label><input type="color" name="colorPrimary" defaultValue={settings?.colorPrimary || "#2c3e50"} /></div>
              <div><label>{t("adminColorAccent")}</label><input type="color" name="colorAccent" defaultValue={settings?.colorAccent || "#27ae60"} /></div>
              <div><label>{t("adminColorBg")}</label><input type="color" name="colorBg" defaultValue={settings?.colorBg || "#121212"} /></div>
            </div>
            <button type="submit" className="btn-primary">{t("save")}</button>
          </form>
          <RoleManagementClient roles={manualRoles} />
        </div>
      )}
    </div>
  );
}
