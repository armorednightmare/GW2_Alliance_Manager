"use client";

import { useState } from "react";
import { analyzeMemberImport, executeMemberImport } from "./actions";

export default function ImportManagementClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await analyzeMemberImport(formData);
      setPreview(data);
      // Auto-select all by default
      setSelectedIndices(new Set(data.map((_: any, i: number) => i)));
    } catch (e: any) {
      alert("Fehler beim Analysieren: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    const items = preview.filter((_, i) => selectedIndices.has(i));
    if (items.length === 0) return alert("Keine Zeilen ausgewählt.");

    setImporting(true);
    try {
      const res = await executeMemberImport(items, true);
      setResult(res);
      setPreview(null);
      setFile(null);
    } catch (e: any) {
      alert("Import fehlgeschlagen: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  const toggleAll = () => {
    if (selectedIndices.size === preview?.length) setSelectedIndices(new Set());
    else setSelectedIndices(new Set(preview?.map((_, i) => i)));
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      {!preview && !result && (
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", background: "rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "8px" }}>
          <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} style={{ flex: 1 }} />
          <button 
            onClick={handleAnalyze} 
            disabled={!file || loading}
            className="btn-primary"
            style={{ width: "auto", padding: "0.5rem 1.5rem" }}
          >
            {loading ? "Analysiere..." : "Datei einlesen"}
          </button>
        </div>
      )}

      {result && (
        <div style={{ background: "rgba(46, 204, 113, 0.1)", border: "1px solid #2ecc71", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
          <h4 style={{ margin: 0, color: "#2ecc71" }}>✅ Import Abgeschlossen</h4>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>
            Erstellt: {result.created} | Aktualisiert: {result.updated} | Fehler: {result.errors}
          </p>
          <button onClick={() => setResult(null)} style={{ marginTop: "1rem", background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "0.3rem 0.6rem", borderRadius: "4px", cursor: "pointer" }}>Neu starten</button>
        </div>
      )}

      {preview && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h4 style={{ margin: 0 }}>Vorschau ({preview.length} Zeilen)</h4>
            <div style={{ display: "flex", gap: "1rem" }}>
                <button onClick={() => setPreview(null)} style={{ background: "transparent", color: "white", border: "none", cursor: "pointer", fontSize: "0.9rem", opacity: 0.7 }}>Abbrechen</button>
                <button onClick={handleImport} disabled={importing} className="btn-primary" style={{ width: "auto", padding: "0.5rem 1.5rem" }}>
                  {importing ? "Importiere..." : `${selectedIndices.size} Zeilen importieren`}
                </button>
            </div>
          </div>

          <div style={{ maxHeight: "500px", overflowY: "auto", background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead style={{ position: "sticky", top: 0, background: "#1a1a1a", zIndex: 1 }}>
                <tr>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <input type="checkbox" checked={selectedIndices.size === preview.length} onChange={toggleAll} />
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Status</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Account</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Rang/Rolle</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Discord</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((item, idx) => (
                  <tr key={idx} style={{ 
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: selectedIndices.has(idx) ? "transparent" : "rgba(255,255,255,0.02)",
                    opacity: selectedIndices.has(idx) ? 1 : 0.5
                  }}>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <input type="checkbox" checked={selectedIndices.has(idx)} onChange={() => toggleSelect(idx)} />
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{item.accountName}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{item.rank}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{item.discordName}</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem" }}>
                      {item.conflicts.length > 0 && (
                        <div style={{ color: "#e74c3c" }}>⚠️ {item.conflicts.join(", ")}</div>
                      )}
                      {item.updates.length > 0 && (
                        <div style={{ color: "#f1c40f" }}>✨ {item.updates.join(", ")}</div>
                      )}
                      {item.status === "NEW" && <span style={{ color: "#2ecc71" }}>Neues Mitglied</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    padding: "0.2rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.7rem",
    fontWeight: "bold",
    textTransform: "uppercase"
  };

  if (status === "NEW") return <span style={{ ...styles, background: "#2ecc71", color: "white" }}>Neu</span>;
  if (status === "CONFLICT") return <span style={{ ...styles, background: "#e74c3c", color: "white" }}>Konflikt</span>;
  return <span style={{ ...styles, background: "#f1c40f", color: "black" }}>Update</span>;
}
