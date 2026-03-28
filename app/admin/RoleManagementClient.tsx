"use client";

import { useState } from "react";
import { addManualRole, deleteManualRole } from "./actions";

export default function RoleManagementClient({ roles }: { roles: any[] }) {
  const [msg, setMsg] = useState("");

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg("Erstelle Rolle...");
    try {
      await addManualRole(new FormData(e.currentTarget));
      setMsg("Rolle erfolgreich angelegt!");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setMsg("Fehler: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Soll diese Rolle wirklich gelöscht werden?")) return;
    try {
      const data = new FormData();
      data.append("id", id);
      await deleteManualRole(data);
    } catch(err: any) {
      alert("Fehler: " + err.message);
    }
  }

  return (
    <div className="glass-panel" style={{ padding: "2rem", marginTop: "2rem" }}>
      <h2>🔖 Benutzerdefinierte Rollen</h2>
      <p style={{ opacity: 0.8, fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Erstelle feste Rollen für eure Allianz (z.B. Commander, Raid-Lead, Roamer). Diese stehen dann als Dropdown in den Spielerprofilen zur Zuweisung bereit.
      </p>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: "1rem", marginBottom: "2rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem" }}>Rollen-Name</label>
          <input 
            type="text" 
            name="name" 
            required 
            placeholder="z.B. Raid-Lead" 
            style={{ padding: "0.6rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "4px" }} 
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem" }}>Badge-Farbe</label>
          <input 
            type="color" 
            name="color" 
            defaultValue="#3498db"
            style={{ padding: "0", background: "none", border: "none", height: "38px", width: "50px", cursor: "pointer" }} 
          />
        </div>
        <button type="submit" style={{ padding: "0.7rem 1.2rem", background: "var(--accent-color)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", height: "38px" }}>
          + Anlegen
        </button>
      </form>

      {msg && <div style={{ marginBottom: "1rem", color: "var(--accent-color)" }}>{msg}</div>}

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {roles.length === 0 && <span style={{ opacity: 0.5 }}>Noch keine Rollen definiert.</span>}
        {roles.map(r => (
          <div key={r.id} style={{ 
            display: "flex", alignItems: "center", gap: "0.5rem", 
            padding: "0.3rem 0.5rem 0.3rem 0.8rem", 
            border: `1px solid ${r.color}`, 
            borderRadius: "20px",
            background: "rgba(0,0,0,0.3)"
          }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: r.color }}></span>
            <span style={{ fontSize: "0.85rem" }}>{r.name}</span>
            <button 
              onClick={() => handleDelete(r.id)}
              style={{ background: "transparent", border: "none", color: "var(--danger-color)", cursor: "pointer", marginLeft: "0.5rem", padding: "0 0.2rem" }}
              title="Löschen"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
