"use client";
import { useState } from "react";
import { resolveGuildsFromToken, addGuild, deleteGuild, updateGuildToken, triggerSync, toggleAllianceGuild, addManualGuild } from "./actions";
import { isHigherStaff } from "@/lib/permissions";

type GuildInfo = { id: string; name: string; tag: string };

// Steps for the add-guild flow
type AddStep = "idle" | "resolving" | "select" | "adding";

interface GuildMember {
  id: string;
  name: string;
  tag: string;
  isAllianceGuild: boolean;
}

interface UserSession {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
    id: string;
  };
}

export default function GuildManagementClient({ guilds, session }: { guilds: GuildMember[], session: UserSession }) {

  const [localGuilds, setLocalGuilds] = useState(guilds);
  const [busy, setBusy] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [editToken, setEditToken] = useState<Record<string, string>>({});

  const user = session?.user;

  const isStaff = isHigherStaff(user);

  // Show Add Guild form if Admin/AllianceLeader OR if User is a Guild Leader
  const canAddGuild = isStaff || user.role === "GUILD_LEADER";

  // Multi-step add flow state
  const [addStep, setAddStep] = useState<AddStep>("idle");
  const [leaderToken, setLeaderToken] = useState("");
  const [resolvedGuilds, setResolvedGuilds] = useState<GuildInfo[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>("");
  const [isAllianceGuild, setIsAllianceGuild] = useState(false);

  // Manual Guild state
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualTag, setManualTag] = useState("");

  const feedback = (text: string, isError = false) => {
    setMsg((isError ? "❌ " : "✓ ") + text);
    setTimeout(() => setMsg(""), 6000);
  };

  // ── Step 1: Resolve guilds from token ─────────────────────────────────────
  const handleResolveToken = async (e: React.FormEvent) => {

    e.preventDefault();
    setAddStep("resolving");
    try {
      const guildsFromApi = await resolveGuildsFromToken(leaderToken);
      // Filter out already-added guilds
      const alreadyAdded = new Set(localGuilds.map((g: GuildMember) => g.id));

      const available = guildsFromApi.filter((g) => !alreadyAdded.has(g.id));

      if (available.length === 0) {
        feedback("Alle Gilden dieses Tokens sind bereits hinzugefügt.", true);
        setAddStep("idle");
        return;
      }

      setResolvedGuilds(available);
      setSelectedGuildId(available[0].id);
      setAddStep("select");
    } catch (e: any) {
      feedback(e.message, true);
      setAddStep("idle");
    }
  };

  // ── Step 2: Add the selected guild ───────────────────────────────────────
  const handleAddSelected = async () => {
    setAddStep("adding");
    const formData = new FormData();
    formData.set("leaderToken", leaderToken);
    formData.set("guildId", selectedGuildId);
    formData.set("isAllianceGuild", isAllianceGuild.toString());
    try {
      await addGuild(formData);
      feedback("Gilde erfolgreich hinzugefügt! Seite wird neu geladen…");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      feedback(e.message, true);
    }
    setLeaderToken("");
    setResolvedGuilds([]);
    setSelectedGuildId("");
    setIsAllianceGuild(false);
    setAddStep("idle");
  };

  const handleCancelAdd = () => {
    setAddStep("idle");
    setResolvedGuilds([]);
    setLeaderToken("");
    setSelectedGuildId("");
  };

  // ── Step 3: Add Manual Guild ──────────────────────────────────────────────
  const handleAddManualGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const formData = new FormData();
    formData.set("name", manualName);
    formData.set("tag", manualTag);
    formData.set("isAllianceGuild", isAllianceGuild.toString());

    try {
      await addManualGuild(formData);
      feedback("Manuelle Gilde erfolgreich hinzugefügt!");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      feedback(e.message, true);
    }
    setBusy(false);
  };

  // ── Existing guild actions ────────────────────────────────────────────────
  const handleDeleteGuild = async (guildId: string, name: string) => {
    if (!confirm(`Gilde "${name}" wirklich entfernen? Alle Members werden als INACTIVE markiert.`)) return;
    setBusy(true);
    try {
      await deleteGuild(guildId);
      setLocalGuilds((prev: GuildMember[]) => prev.filter((g) => g.id !== guildId));

      feedback("Gilde entfernt");
    } catch (e: any) {
      feedback(e.message, true);
    }
    setBusy(false);
  };

  const handleUpdateToken = async (guildId: string) => {
    const token = editToken[guildId];
    if (!token) return;
    setBusy(true);
    try {
      await updateGuildToken(guildId, token);
      setEditToken((prev: Record<string, string>) => ({ ...prev, [guildId]: "" }));

      feedback("API Key aktualisiert ✓");
    } catch (e: any) {
      feedback(e.message, true);
    }
    setBusy(false);
  };

  const handleToggleAlliance = async (guildId: string, currentStatus: boolean) => {
    setBusy(true);
    try {
      await toggleAllianceGuild(guildId, !currentStatus);
      setLocalGuilds((prev: GuildMember[]) => prev.map(g => g.id === guildId ? { ...g, isAllianceGuild: !currentStatus } : g));

      feedback(`Gilden-Status aktualisiert ✓`);
    } catch (e: any) {
      feedback(e.message, true);
    }
    setBusy(false);
  };

  const handleSync = async () => {
    setBusy(true);
    setSyncLogs([]);
    setMsg("Sync läuft…");
    try {
      const logs = await triggerSync();
      setSyncLogs(logs);
      feedback(`Sync abgeschlossen – ${logs.length} Änderung(en)`);
    } catch (e: any) {
      feedback(e.message, true);
    }
    setBusy(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ marginTop: "2rem" }}>
      {/* Feedback bar */}
      {msg && (
        <div style={{
          padding: "0.75rem 1rem",
          background: msg.startsWith("❌") ? "rgba(231,76,60,0.15)" : "rgba(102,252,241,0.15)",
          border: `1px solid ${msg.startsWith("❌") ? "rgba(231,76,60,0.4)" : "rgba(102,252,241,0.4)"}`,
          borderRadius: "8px",
          marginBottom: "1rem",
          color: msg.startsWith("❌") ? "#e74c3c" : "var(--accent-color)",
          fontSize: "0.9rem",
        }}>
          {msg}
        </div>
      )}

      {/* Existing Guilds Table */}
      {localGuilds.length > 0 && (
        <div style={{ marginBottom: "2rem", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "0.8rem 1rem", textAlign: "left", opacity: 0.7, fontWeight: 600 }}>{isStaff ? "Typ" : ""}</th>
                <th style={{ padding: "0.8rem 1rem", textAlign: "left", opacity: 0.7, fontWeight: 600 }}>Gilde</th>
                <th style={{ padding: "0.8rem 1rem", textAlign: "left", opacity: 0.7, fontWeight: 600 }}>Tag</th>
                <th style={{ padding: "0.8rem 1rem", textAlign: "left", opacity: 0.7, fontWeight: 600 }}>Guild ID</th>
                <th style={{ padding: "0.8rem 1rem", textAlign: "left", opacity: 0.7, fontWeight: 600 }}>Leader Token aktualisieren</th>
                {isStaff && <th style={{ padding: "0.8rem 1rem", textAlign: "left", opacity: 0.7, fontWeight: 600 }}>Aktionen</th>}
              </tr>
            </thead>
            <tbody>
              {localGuilds.map((g: GuildMember) => (

                <tr key={g.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: g.isAllianceGuild ? "rgba(102,252,241,0.05)" : "transparent" }}>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    {isStaff ? (
                      <button
                        onClick={() => handleToggleAlliance(g.id, g.isAllianceGuild)}
                        disabled={busy}
                        title={g.isAllianceGuild ? "Als normale Gilde setzen" : "Als Haupt-Allianzgilde setzen"}
                        style={{
                          background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer",
                          filter: g.isAllianceGuild ? "none" : "grayscale(1) opacity(0.3)"
                        }}
                      >
                        ⚔️
                      </button>
                    ) : (
                      g.isAllianceGuild ? "⚔️" : ""
                    )}
                  </td>
                  <td style={{ padding: "0.8rem 1rem", fontWeight: 600 }}>
                    {g.name} {g.isAllianceGuild && <span style={{ color: "var(--accent-color)", marginLeft: "5px" }} title="Haupt-Allianzgilde">⚔️</span>}
                  </td>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <span style={{ background: "var(--primary-color)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.85rem" }}>
                      [{g.tag}]
                    </span>
                  </td>
                  <td style={{ padding: "0.8rem 1rem", fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.7 }}>
                    {g.id.slice(0, 14)}…
                  </td>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <input
                        type="text"
                        placeholder="Neuer Token"
                        value={editToken[g.id] || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditToken((prev: Record<string, string>) => ({ ...prev, [g.id]: e.target.value }))}

                        style={{ padding: "0.3rem 0.5rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "white", borderRadius: "6px", width: "160px", fontSize: "0.8rem" }}
                      />
                      <button onClick={() => handleUpdateToken(g.id)} disabled={busy}
                        style={{ padding: "0.3rem 0.6rem", background: "rgba(52,152,219,0.2)", border: "1px solid rgba(52,152,219,0.4)", color: "#3498db", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}>
                        Update
                      </button>
                    </div>
                  </td>
                  {isStaff && (
                    <td style={{ padding: "0.8rem 1rem" }}>
                      <button onClick={() => handleDeleteGuild(g.id, g.name)} disabled={busy}
                        style={{ padding: "0.4rem 0.8rem", background: "rgba(231,76,60,0.15)", border: "1px solid rgba(231,76,60,0.4)", color: "#e74c3c", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                        🗑 Entfernen
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Guild Selector (Staff Only or restricted Guild Leader) ── */}
      {canAddGuild && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <button 
            onClick={() => { setAddStep("idle"); setShowManualAdd(false); }} 
            className="btn-primary" style={{ opacity: (!showManualAdd && addStep !== "idle") ? 1 : 0.7 }}
          >
            ➕ Gilde via API Key
          </button>
          {isStaff && (
            <button 
              onClick={() => { setShowManualAdd(true); setAddStep("idle"); }} 
              className="btn-primary" style={{ opacity: showManualAdd ? 1 : 0.7 }}
            >
              ➕ Manuelle Gilde erstellen
            </button>
          )}
        </div>
      )}

      {/* ── Multi-Step Add Guild (API) ── */}
      {canAddGuild && !showManualAdd && (
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>Gilde über API Key hinzufügen</h3>

          {/* Step indicators */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {[
              { step: 1, label: "API Key eingeben", active: addStep === "idle" || addStep === "resolving" },
              { step: 2, label: "Gilde auswählen", active: addStep === "select" || addStep === "adding" },
            ].map(({ step, label, active }) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: "0.4rem", opacity: active ? 1 : 0.35 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: active ? "var(--accent-color)" : "rgba(255,255,255,0.1)",
                  color: active ? "var(--bg-color)" : "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "0.8rem",
                }}>
                  {step}
                </div>
                <span style={{ fontSize: "0.85rem" }}>{label}</span>
                {step < 2 && <span style={{ opacity: 0.3, margin: "0 0.25rem" }}>›</span>}
              </div>
            ))}
          </div>

          {/* Step 1: Token input */}
          {(addStep === "idle" || addStep === "resolving") && (
            <form onSubmit={handleResolveToken} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "560px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", opacity: 0.8 }}>
                  Leader API Key <span style={{ color: "#e74c3c" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXXXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                  value={leaderToken}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeaderToken(e.target.value)}

                  required
                  style={{ width: "100%", padding: "0.65rem", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "6px", fontSize: "0.85rem" }}
                />
              </div>
              <button
                type="submit"
                disabled={addStep === "resolving"}
                style={{ padding: "0.7rem 1.2rem", background: "var(--accent-color)", color: "var(--bg-color)", border: "none", borderRadius: "6px", cursor: addStep === "resolving" ? "wait" : "pointer", fontWeight: 700, maxWidth: "220px" }}
              >
                {addStep === "resolving" ? "⏳ Gilden werden geladen…" : "Gilden abrufen →"}
              </button>
            </form>
          )}

          {/* Step 2: Select omitted... similar logic */}
          {(addStep === "select" || addStep === "adding") && (
            <div style={{ maxWidth: "560px" }}>
              <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", opacity: 0.8 }}>
                {resolvedGuilds.length} Gilde(n) gefunden. Wähle aus, welche du als DEINE Gilde registrieren möchtest:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                {resolvedGuilds.map((g) => (
                  <label
                    key={g.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      cursor: "pointer",
                      background: selectedGuildId === g.id ? "rgba(102,252,241,0.1)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${selectedGuildId === g.id ? "rgba(102,252,241,0.5)" : "rgba(255,255,255,0.08)"}`,
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="radio"
                      name="guildSelect"
                      value={g.id}
                      checked={selectedGuildId === g.id}
                      onChange={() => setSelectedGuildId(g.id)}
                      style={{ accentColor: "var(--accent-color)", width: 16, height: 16 }}
                    />
                    <span style={{ fontWeight: 700, minWidth: 60 }}>
                      [{g.tag}]
                    </span>
                    <span style={{ flexGrow: 1 }}>{g.name}</span>
                  </label>
                ))}
              </div>

              {isStaff && (
                <div style={{ marginBottom: "1.25rem", padding: "0.75rem", background: "rgba(102,252,241,0.05)", borderRadius: "8px", border: "1px solid rgba(102,252,241,0.2)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isAllianceGuild}
                      onChange={(e) => setIsAllianceGuild(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: "var(--accent-color)" }}
                    />
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                      Dies ist die Haupt-Allianzgilde (⚔️ Kampfgilde)
                    </span>
                  </label>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={handleAddSelected}
                  disabled={addStep === "adding" || !selectedGuildId}
                  style={{ padding: "0.7rem 1.2rem", background: "var(--accent-color)", color: "black", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 700 }}
                >
                  {addStep === "adding" ? "⏳ Wird hinzugefügt…" : "✓ Gilde registrieren"}
                </button>
                <button
                  onClick={handleCancelAdd}
                  style={{ padding: "0.7rem 1rem", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "6px", cursor: "pointer" }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Add Manual Guild (Staff Only) ── */}
      {isStaff && showManualAdd && (
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>Manuelle Gilde erstellen (Ohne API)</h3>
          <form onSubmit={handleAddManualGuild} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", opacity: 0.8 }}>Gilden-Name</label>
              <input type="text" value={manualName} onChange={e => setManualName(e.target.value)} required className="search-input" placeholder="Beispiel Gilde" style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", opacity: 0.8 }}>Gilden-Tag</label>
              <input type="text" value={manualTag} onChange={e => setManualTag(e.target.value)} required className="search-input" placeholder="TAG" style={{ width: "100%" }} />
            </div>
            <div style={{ padding: "0.75rem", background: "rgba(102,252,241,0.05)", borderRadius: "8px", border: "1px solid rgba(102,252,241,0.2)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isAllianceGuild}
                  onChange={(e) => setIsAllianceGuild(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: "var(--accent-color)" }}
                />
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  Dies ist die Haupt-Allianzgilde (⚔️)
                </span>
              </label>
            </div>
            <button type="submit" disabled={busy} className="btn-primary" style={{ padding: "0.7rem", fontWeight: "bold" }}>
              {busy ? "⏳ Speichere..." : "✓ Manuelle Gilde anlegen"}
            </button>
          </form>
        </div>
      )}

      {/* Sync Button */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button
          onClick={handleSync}
          disabled={busy || localGuilds.length === 0}
          className="btn-primary"
          style={{ padding: "0.8rem 1.5rem" }}
        >
          🔄 {busy && syncLogs.length === 0 ? "Sync läuft…" : "Guild Roster Sync starten"}
        </button>
      </div>

      {/* Sync Logs */}
      {syncLogs.length > 0 && (
        <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.85rem" }}>
          {syncLogs.map((log, i) => (
            <div key={i} style={{ padding: "0.15rem 0", opacity: 0.9 }}>› {log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
