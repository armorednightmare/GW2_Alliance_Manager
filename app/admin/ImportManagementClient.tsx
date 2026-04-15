"use client";

import { useState, useEffect } from "react";
import { getImportHeaders, analyzeMemberImport, executeMemberImport } from "./actions";

type Step = "UPLOAD" | "MAPPING" | "PREVIEW" | "RESULT";

const TARGET_FIELDS = [
  { key: "accountName", label: "Account Name (Pflicht)", fuzzy: ["accountname", "account name", "account id", "account"] },
  { key: "rank", label: "Rang/Rolle", fuzzy: ["rolle", "rang", "rank", "role"] },
  { key: "joinedAt", label: "Beitrittsdatum", fuzzy: ["beitritt", "datum join", "join date", "mitglied seit", "eintritt", "join"] },
  { key: "discordName", label: "Discord Name", fuzzy: ["discordname", "discord name", "discord tag", "discord"] },
  { key: "guildName", label: "Zweit-Gilde", fuzzy: ["gildenzugehörigkeit", "gilde", "guild"] },
  { key: "comment", label: "Info/Kommentar", fuzzy: ["info", "kommentar", "notiz", "comment", "note"] },
];

export default function ImportManagementClient() {
  const [step, setStep] = useState<Step>("UPLOAD");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [enabledFields, setEnabledFields] = useState<Set<string>>(new Set(TARGET_FIELDS.map(f => f.key)));


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setStep("UPLOAD");
      setPreview(null);
      setResult(null);
    }
  };

  const handleReadHeaders = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const cols = await getImportHeaders(formData);
      setHeaders(cols);
      
      // Smart Auto-Mapping
      const initialMapping: Record<string, string> = {};
      TARGET_FIELDS.forEach(field => {
        const found = cols.find(c => field.fuzzy.some(f => c.toLowerCase().includes(f.toLowerCase())));
        if (found) initialMapping[field.key] = found;
      });
      setMapping(initialMapping);
      
      // Auto-disable joinedAt if it was found, as requested
      const newEnabled = new Set(TARGET_FIELDS.map(f => f.key));
      if (initialMapping.joinedAt) {
        newEnabled.delete("joinedAt");
      }
      setEnabledFields(newEnabled);

      setStep("MAPPING");
    } catch (e: any) {
      alert("Fehler beim Einlesen: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    if (!mapping.accountName) return alert("Bitte wähle die Spalte für 'Account Name' aus.");
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Analyze ALL mapped fields so the user can see everything in the preview
      const activeMapping: Record<string, string> = { ...mapping };

      const data = await analyzeMemberImport(formData, activeMapping);
      setPreview(data);
      setSelectedIndices(new Set(data.map((_: any, i: number) => i)));
      setStep("PREVIEW");
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
      // Filter out fields that are disabled in the UI
      const preparedItems = items.map(item => {
        // Deep clone the item and its excelData to avoid side effects
        const cleaned = { 
          ...item,
          excelData: { ...item.excelData }
        };
        
        if (!enabledFields.has("rank")) {
          cleaned.excelData.rank = null;
          cleaned.diff.rank.isChanged = false;
        }
        if (!enabledFields.has("joinedAt")) {
          cleaned.excelData.joinedAt = null;
          cleaned.diff.joinedAt.isChanged = false;
        }
        if (!enabledFields.has("discordName")) {
          cleaned.excelData.discordName = null;
          cleaned.diff.discordName.isChanged = false;
        }
        if (!enabledFields.has("guildName")) {
          cleaned.excelData.guildName = null;
          cleaned.diff.guildName.isChanged = false;
        }
        if (!enabledFields.has("comment")) {
          cleaned.excelData.comment = null;
          cleaned.diff.comment.isChanged = false;
        }
        
        return cleaned;
      });

      const res = await executeMemberImport(preparedItems, true);
      setResult(res);
      setStep("RESULT");
    } catch (e: any) {
      alert("Import fehlgeschlagen: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep("UPLOAD");
    setFile(null);
    setPreview(null);
    setResult(null);
    setMapping({});
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      {/* STEP 1: UPLOAD */}
      {step === "UPLOAD" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "rgba(255,255,255,0.05)", padding: "2rem", borderRadius: "8px", textAlign: "center" }}>
          <div>
            <p style={{ opacity: 0.7, marginBottom: "1rem" }}>Wähle eine Excel- oder CSV-Datei aus, um den Import zu starten.</p>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} id="import-file" style={{ display: "none" }} />
            <label htmlFor="import-file" style={{ 
              display: "inline-block", 
              padding: "1rem 2rem", 
              background: "rgba(255,255,255,0.1)", 
              border: "2px dashed rgba(255,255,255,0.2)", 
              borderRadius: "8px", 
              cursor: "pointer",
              transition: "all 0.2s"
            }}>
              {file ? <strong>📄 {file.name}</strong> : "Datei auswählen oder hierher ziehen"}
            </label>
          </div>
          {file && (
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); handleReadHeaders(); }} 
              disabled={loading} 
              className="btn-primary" 
              style={{ alignSelf: "center", width: "auto", padding: "0.5rem 2rem" }}
            >
              {loading ? "Wird geladen..." : "Spalten zuordnen ➔"}
            </button>
          )}
        </div>
      )}

      {/* STEP 2: MAPPING */}
      {step === "MAPPING" && (
        <div style={{ background: "rgba(255,255,255,0.05)", padding: "1.5rem", borderRadius: "8px" }}>
          <h4 style={{ margin: "0 0 1rem 0" }}>Spalten-Zuordnung</h4>
          <p style={{ fontSize: "0.9rem", opacity: 0.7, marginBottom: "1.5rem" }}>
            Ordne die Spalten aus deiner Datei den Datenbank-Feldern zu.
          </p>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.5rem" }}>
            {TARGET_FIELDS.map(field => (
              <div key={field.key} style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "0.5rem",
                opacity: enabledFields.has(field.key) ? 1 : 0.5,
                transition: "opacity 0.2s"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                    {field.label}
                  </label>
                </div>
                <select 
                  value={mapping[field.key] || ""} 
                  onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                  style={{ padding: "0.5rem", background: "#1a1a1a", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px" }}
                >
                  <option value="">-- Nicht zugeordnet --</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.5rem" }}>
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); setStep("UPLOAD"); }} 
              style={{ background: "transparent", border: "none", color: "white", opacity: 0.7, cursor: "pointer" }}
            >
              Zurück
            </button>
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); handleAnalyze(); }} 
              disabled={loading} 
              className="btn-primary" 
              style={{ width: "auto", padding: "0.5rem 2rem" }}
            >
              {loading ? "Verarbeite..." : "Vorschau generieren ➔"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW */}
      {step === "PREVIEW" && preview && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h4 style={{ margin: 0 }}>Vorschau ({preview.length} Zeilen)</h4>
            <div style={{ display: "flex", gap: "1rem" }}>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); setStep("MAPPING"); }} 
                  style={{ background: "transparent", color: "white", border: "none", cursor: "pointer", fontSize: "0.9rem", opacity: 0.7 }}
                >
                  Mapping ändern
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleImport(); }} 
                  disabled={importing} 
                  className="btn-primary" 
                  style={{ width: "auto", padding: "0.5rem 2.5rem" }}
                >
                  {importing ? "Importiere..." : `${selectedIndices.size} Zeilen importieren`}
                </button>
            </div>
          </div>

          <div style={{ maxHeight: "600px", overflow: "auto", background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", minWidth: "1200px" }}>
              <thead style={{ position: "sticky", top: 0, background: "#1a1a1a", zIndex: 1 }}>
                <tr>
                  <th style={{ padding: "0.75rem", textAlign: "left", width: "40px" }}>
                    <input type="checkbox" checked={selectedIndices.size === preview.length} onChange={() => {
                       if (selectedIndices.size === preview.length) setSelectedIndices(new Set());
                       else setSelectedIndices(new Set(preview.map((_, i) => i)));
                    }} />
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", width: "80px" }}>Status</th>
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>Account</th>
                  {TARGET_FIELDS.slice(1).map(field => (
                    <th key={field.key} style={{ padding: "0.75rem", textAlign: "left", opacity: enabledFields.has(field.key) ? 1 : 0.5, transition: "opacity 0.2s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <input 
                          type="checkbox" 
                          checked={enabledFields.has(field.key)}
                          onChange={(e) => {
                            const next = new Set(enabledFields);
                            if (e.target.checked) next.add(field.key); else next.delete(field.key);
                            setEnabledFields(next);
                          }}
                        />
                        {field.label.split(" (")[0]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((item, idx) => (
                  <tr key={idx} style={{ 
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: selectedIndices.has(idx) ? "transparent" : "rgba(255,255,255,0.02)",
                    opacity: selectedIndices.has(idx) ? 1 : 0.5
                  }}>
                    <td style={{ padding: "0.75rem" }}>
                      <input type="checkbox" checked={selectedIndices.has(idx)} onChange={() => {
                        const next = new Set(selectedIndices);
                        if (next.has(idx)) next.delete(idx); else next.add(idx);
                        setSelectedIndices(next);
                      }} />
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={{ padding: "0.75rem", fontWeight: "bold" }}>{item.accountName}</td>
                    
                    <DiffCell diff={item.diff.rank} enabled={enabledFields.has("rank")} />
                    <DiffCell diff={item.diff.joinedAt} isDate enabled={enabledFields.has("joinedAt")} />
                    <DiffCell diff={item.diff.discordName} enabled={enabledFields.has("discordName")} />
                    <DiffCell diff={item.diff.guildName} enabled={enabledFields.has("guildName")} />
                    <DiffCell diff={item.diff.comment} enabled={enabledFields.has("comment")} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 4: RESULT */}
      {step === "RESULT" && result && (
        <div style={{ background: "rgba(46, 204, 113, 0.1)", border: "1px solid #2ecc71", padding: "2rem", borderRadius: "8px", textAlign: "center" }}>
          <h3 style={{ margin: 0, color: "#2ecc71" }}>🎉 Import erfolgreich!</h3>
          <p style={{ margin: "1rem 0", fontSize: "1.1rem" }}>
            <strong>{result.created}</strong> neue Mitglieder erstellt<br />
            <strong>{result.updated}</strong> Profile aktualisiert<br />
            {result.errors > 0 && <span style={{ color: "#e74c3c" }}><strong>{result.errors}</strong> Fehler aufgetreten</span>}
          </p>
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); reset(); }} 
            className="btn-primary" 
            style={{ width: "auto", padding: "0.5rem 2rem", marginTop: "1rem" }}
          >
            Zurück zur Übersicht
          </button>
        </div>
      )}
    </div>
  );
}

function DiffCell({ diff, isDate, enabled }: { diff: any, isDate?: boolean, enabled?: boolean }) {
  const formatDate = (val: string) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("de-DE");
  };

  const oldVal = isDate ? formatDate(diff.old) : diff.old;
  const newVal = isDate ? formatDate(diff.new) : diff.new;

  if (!enabled) {
    return <td style={{ padding: "0.75rem", opacity: 0.15, fontSize: "0.8rem", fontStyle: "italic" }}>Übersprungen</td>;
  }

  if (!diff.isChanged) {
    return <td style={{ padding: "0.75rem", opacity: 0.5, fontSize: "0.8rem" }}>{newVal || "-"}</td>;
  }

  return (
    <td style={{ padding: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
        {diff.old && (
          <span style={{ textDecoration: "line-through", opacity: 0.4, fontSize: "0.75rem" }}>
            {oldVal}
          </span>
        )}
        <span style={{ opacity: 0.4, fontSize: "0.8rem" }}>➔</span>
        <span style={{ 
          color: diff.conflict ? "#ff7675" : "#fdcb6e", 
          fontWeight: "bold",
          fontSize: "0.85rem"
        }}>
          {newVal || "(leer)"}
        </span>
      </div>
    </td>
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
