"use client";
import { useState } from "react";
import {
  changeUserRole,
  deleteUser,
  resetUserPassword,
  unlinkUserGw2,
  createManualUser,
  updateUserManagedGuilds
} from "./actions";

const ROLES = ["ADMIN", "ALLIANCE_LEADER", "GUILD_LEADER", "WEB_MEMBER", "NEW_USER"];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#e74c3c",
  ALLIANCE_LEADER: "#9b59b6",
  GUILD_LEADER: "#3498db",
  WEB_MEMBER: "#7f8c8d",
  NEW_USER: "#f39c12",
};

interface ManagedGuild {
  id: string;
}

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  memberId?: string | null;
  member?: {
    accountName: string;
  } | null;
  managedGuilds?: ManagedGuild[];
}

interface Guild {
  id: string;
  name: string;
  tag: string;
}

export default function UserManagementClient({ users, guilds }: { users: User[], guilds: Guild[] }) {

  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [resetPw, setResetPw] = useState<Record<string, string>>({});
  const [localUsers, setLocalUsers] = useState(users);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "WEB_MEMBER" });

  const feedback = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 4000);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setBusy(userId + "-role");
    try {
      await changeUserRole(userId, role);
      setLocalUsers((prev: User[]) =>
        prev.map((u: User) => (u.id === userId ? { ...u, role } : u))
      );

      feedback(`Rolle aktualisiert ✓`);
    } catch (e: any) {
      feedback("Fehler: " + e.message);
    }
    setBusy(null);
  };

  const handleGuildToggle = async (userId: string, guildId: string, currentIds: string[]) => {
    setBusy(userId + "-guild-" + guildId);
    try {
      let newIds = [...currentIds];
      if (newIds.includes(guildId)) {
        newIds = newIds.filter(id => id !== guildId);
      } else {
        newIds.push(guildId);
      }
      
      await updateUserManagedGuilds(userId, newIds);
      setLocalUsers((prev: User[]) =>
        prev.map((u: User) => (u.id === userId ? { ...u, managedGuilds: newIds.map(id => ({ id })) } : u))
      );

      feedback(`Berechtigung aktualisiert ✓`);
    } catch (e: any) {
      feedback("Fehler: " + e.message);
    }
    setBusy(null);
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`User "${username}" wirklich löschen?`)) return;
    setBusy(userId + "-del");
    try {
      await deleteUser(userId);
      setLocalUsers((prev: User[]) => prev.filter((u: User) => u.id !== userId));

      feedback(`User gelöscht ✓`);
    } catch (e: any) {
      feedback("Fehler: " + e.message);
    }
    setBusy(null);
  };

  const handlePasswordReset = async (userId: string) => {
    const pw = resetPw[userId];
    if (!pw || pw.length < 4) return feedback("Passwort zu kurz (min. 4 Zeichen)");
    setBusy(userId + "-pw");
    try {
      await resetUserPassword(userId, pw);
      setResetPw((prev: Record<string, string>) => ({ ...prev, [userId]: "" }));

      feedback(`Passwort gesetzt ✓`);
    } catch (e: any) {
      feedback("Fehler: " + e.message);
    }
    setBusy(null);
  };

  const handleUnlinkGw2 = async (userId: string) => {
    setBusy(userId + "-unlink");
    try {
      await unlinkUserGw2(userId);
      setLocalUsers((prev: User[]) =>
        prev.map((u: User) => (u.id === userId ? { ...u, memberId: null, member: null } : u))
      );

      feedback(`GW2-Verknüpfung getrennt ✓`);
    } catch (e: any) {
      feedback("Fehler: " + e.message);
    }
    setBusy(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {

    e.preventDefault();
    setBusy("create");
    try {
      const formData = new FormData();
      formData.set("username", newUser.username);
      formData.set("password", newUser.password);
      formData.set("role", newUser.role);
      
      await createManualUser(formData);
      feedback("Benutzer erfolgreich angelegt ✓");
      setNewUser({ username: "", password: "", role: "WEB_MEMBER" });
      setShowAddForm(false);
      window.location.reload(); 
    } catch (e: any) {
      feedback("Fehler: " + e.message);
    }
    setBusy(null);
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      {msg && (
        <div style={{
          padding: "0.75rem 1rem",
          background: msg.includes("Fehler") ? "rgba(231,76,60,0.15)" : "rgba(102,252,241,0.15)",
          border: `1px solid ${msg.includes("Fehler") ? "rgba(231,76,60,0.4)" : "rgba(102,252,241,0.4)"}`,
          borderRadius: "8px",
          marginBottom: "1rem",
          color: msg.includes("Fehler") ? "#e74c3c" : "var(--accent-color)",
          fontSize: "0.9rem",
        }}>
          {msg}
        </div>
      )}

      {/* --- Add Manual User Form --- */}
      <div style={{ marginBottom: "2rem" }}>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ 
            padding: "0.6rem 1.2rem", 
            background: "rgba(102,252,241,0.1)", 
            color: "var(--accent-color)", 
            border: "1px solid rgba(102,252,241,0.3)", 
            borderRadius: "8px", 
            cursor: "pointer",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          {showAddForm ? "✕ Abbrechen" : "👤 Neuen Benutzer manuell anlegen"}
        </button>

        {showAddForm && (
          <form onSubmit={handleCreateUser} style={{ 
            marginTop: "1rem", 
            padding: "1.5rem", 
            background: "rgba(255,255,255,0.03)", 
            border: "1px solid rgba(255,255,255,0.06)", 
            borderRadius: "12px",
            maxWidth: "500px",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>👤 Benutzerdetails</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", opacity: 0.7, marginBottom: "0.3rem" }}>Benutzername (Login)</label>
                <input 
                  type="text" 
                  required
                  value={newUser.username}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                  style={{ width: "100%", padding: "0.5rem", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", opacity: 0.7, marginBottom: "0.3rem" }}>Passwort</label>
                <input 
                  type="text" 
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  style={{ width: "100%", padding: "0.5rem", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "6px" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", opacity: 0.7, marginBottom: "0.3rem" }}>Rolle</label>
              <select 
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value})}
                style={{ width: "100%", padding: "0.5rem", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "6px", cursor: "pointer" }}
              >
                {ROLES.map(r => <option key={r} value={r} style={{ background: "#222" }}>{r}</option>)}
              </select>
            </div>

            <button 
              type="submit" 
              disabled={busy === "create"}
              style={{ 
                padding: "0.7rem", 
                background: "var(--accent-color)", 
                color: "black", 
                border: "none", 
                borderRadius: "6px", 
                fontWeight: 700, 
                cursor: "pointer",
                marginTop: "0.5rem"
              }}
            >
              {busy === "create" ? "Lädt..." : "Benutzer Account erstellen"}
            </button>
          </form>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
              {["Name", "GW2 Account", "Rolle / Verwaltung", "Passwort Reset", "Aktionen"].map((h) => (
                <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", opacity: 0.7, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {localUsers.map((u: User) => {
                const managedIds = (u.managedGuilds || []).map((g: ManagedGuild) => g.id);

                return (
              <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {/* Name */}
                <td style={{ padding: "0.8rem 1rem" }}>
                  <div style={{ fontWeight: 600 }}>{u.name || "OAuth User"}</div>
                </td>

                {/* GW2 Account */}
                <td style={{ padding: "0.8rem 1rem" }}>
                  {u.member ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "var(--accent-color)", fontWeight: 600 }}>
                        {u.member.accountName}
                      </span>
                      <button
                        onClick={() => handleUnlinkGw2(u.id)}
                        disabled={busy === u.id + "-unlink"}
                        style={{
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.75rem",
                          background: "rgba(231,76,60,0.2)",
                          border: "1px solid rgba(231,76,60,0.4)",
                          color: "#e74c3c",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Trennen
                      </button>
                    </div>
                  ) : (
                    <span style={{ opacity: 0.4, fontSize: "0.85rem" }}>Nicht verknüpft</span>
                  )}
                </td>

                {/* Role / Managed Guilds */}
                <td style={{ padding: "0.8rem 1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <select
                      value={u.role}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRoleChange(u.id, e.target.value)}

                      disabled={busy?.startsWith(u.id)}
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        color: ROLE_COLORS[u.role] || "white",
                        border: `1px solid ${ROLE_COLORS[u.role] || "rgba(255,255,255,0.2)"}`,
                        borderRadius: "6px",
                        padding: "0.3rem 0.5rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        width: "160px"
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r} style={{ color: ROLE_COLORS[r] }}>{r}</option>
                      ))}
                    </select>

                    {(u.role === "GUILD_LEADER" || u.role === "ALLIANCE_LEADER") && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.2rem" }}>
                        <label style={{ fontSize: "0.75rem", opacity: 0.6 }}>Verwaltete Gilden:</label>
                        <div style={{ 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "0.25rem", 
                            maxHeight: "150px", 
                            overflowY: "auto",
                            padding: "0.5rem",
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: "6px",
                            border: "1px solid rgba(255,255,255,0.08)"
                        }}>
                          {guilds.map((g) => (
                            <label key={g.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
                              <input 
                                type="checkbox" 
                                checked={managedIds.includes(g.id)}
                                disabled={busy?.startsWith(u.id)}
                                onChange={() => handleGuildToggle(u.id, g.id, managedIds)}
                                style={{ accentColor: "var(--accent-color)" }}
                              />
                              <span style={{ opacity: managedIds.includes(g.id) ? 1 : 0.6 }}>
                                {g.name} [{g.tag}]
                              </span>
                            </label>
                          ))}
                          {guilds.length === 0 && <span style={{ fontSize: "0.75rem", opacity: 0.3 }}>Keine Gilden angelegt</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </td>

                {/* Password Reset */}
                <td style={{ padding: "0.8rem 1rem" }}>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <input
                      type="text"
                      placeholder="Neues Passwort"
                      value={resetPw[u.id] || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResetPw((prev: Record<string, string>) => ({ ...prev, [u.id]: e.target.value }))}

                      style={{
                        padding: "0.3rem 0.5rem",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "white",
                        borderRadius: "6px",
                        width: "130px",
                        fontSize: "0.85rem",
                      }}
                    />
                    <button
                      onClick={() => handlePasswordReset(u.id)}
                      disabled={busy === u.id + "-pw"}
                      style={{
                        padding: "0.3rem 0.6rem",
                        background: "rgba(52,152,219,0.2)",
                        border: "1px solid rgba(52,152,219,0.4)",
                        color: "#3498db",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      Setzen
                    </button>
                  </div>
                </td>

                {/* Delete */}
                <td style={{ padding: "0.8rem 1rem" }}>
                  <button
                    onClick={() => handleDelete(u.id, u.name || "Unbekannt")}
                    disabled={busy === u.id + "-del"}
                    style={{
                      padding: "0.4rem 0.8rem",
                      background: "rgba(231,76,60,0.15)",
                      border: "1px solid rgba(231,76,60,0.4)",
                      color: "#e74c3c",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    🗑 Löschen
                  </button>
                </td>
              </tr>
            );
            })}
            {localUsers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>
                  Noch keine registrierten User.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
