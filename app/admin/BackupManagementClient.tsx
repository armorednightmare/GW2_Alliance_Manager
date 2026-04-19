"use client";

import { useState, useTransition, useEffect } from "react";
import { triggerManualBackup, getBackupList, unlinkBackupAccount } from "./actions";

interface BackupFile {
  id: string;
  name: string;
  size?: string;
  createdTime: string;
}

export default function BackupManagementClient({ initialBackups, backupEmail }: { initialBackups: BackupFile[], backupEmail?: string | null }) {
  const [backups, setBackups] = useState<BackupFile[]>(initialBackups);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleManualBackup = async () => {
    if (!confirm("Möchtest du jetzt manuell ein Datenbank-Backup auf Google Drive erstellen?")) return;

    setMessage(null);
    startTransition(async () => {
      try {
        const res = await triggerManualBackup();
        if (res.success) {
          setMessage({ type: "success", text: "✅ Backup erfolgreich erstellt und auf Google Drive hochgeladen!" });
          refreshList();
        }
      } catch (e: any) {
        setMessage({ type: "error", text: `❌ Fehler: ${e.message}` });
      }
    });
  };

  const handleUnlink = async () => {
    if (!confirm("Möchtest du die Verknüpfung zu Google Drive wirklich trennen?")) return;
    await unlinkBackupAccount();
    setMessage({ type: "success", text: "✅ Verknüpfung getrennt." });
    setBackups([]);
  };

  const refreshList = async () => {
    const list = await getBackupList();
    setBackups(list);
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return "Unbekannt";
    const b = parseInt(bytes);
    if (isNaN(b)) return bytes;
    return (b / 1024 / 1024).toFixed(2) + " MB";
  };

  return (
    <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>Manuelle Backup-Verwaltung</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>
            Hier kannst du sofort ein Backup erzwingen oder die Liste deiner Dateien auf Google Drive einsehen.
          </p>
          <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            {backupEmail ? (
              <>
                <div style={{ fontSize: "0.85rem", padding: "0.3rem 0.6rem", background: "rgba(46, 204, 113, 0.1)", border: "1px solid rgba(46, 204, 113, 0.3)", borderRadius: "4px", color: "#2ecc71" }}>
                  ✅ Verknüpft mit {backupEmail}
                </div>
                <button 
                  onClick={handleUnlink}
                  style={{ background: "transparent", border: "none", color: "#e74c3c", fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline" }}
                >
                  Verknüpfung trennen
                </button>
              </>
            ) : (
              <a 
                href="/api/admin/backup/link"
                className="btn-primary"
                style={{ width: "auto", padding: "0.4rem 1rem", fontSize: "0.85rem", textDecoration: "none", display: "inline-block" }}
              >
                🔑 Google Drive jetzt verknüpfen
              </a>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            onClick={refreshList}
            disabled={isPending}
            style={{ 
              padding: "0.4rem 0.8rem", 
              background: "rgba(255,255,255,0.05)", 
              border: "1px solid rgba(255,255,255,0.1)", 
              borderRadius: "4px", 
              color: "white", 
              fontSize: "0.85rem", 
              cursor: "pointer" 
            }}
          >
            Aktualisieren
          </button>
          <button 
            disabled={isPending}
            onClick={handleManualBackup}
            className="btn-primary"
            style={{ width: "auto", padding: "0.5rem 1.5rem" }}
          >
            {isPending ? "⏳ Backup läuft..." : "🚀 Jetzt Backup erstellen"}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ 
          padding: "0.75rem 1rem", 
          borderRadius: "4px", 
          background: message.type === "success" ? "rgba(46, 204, 113, 0.2)" : "rgba(231, 76, 60, 0.2)",
          border: `1px solid ${message.type === "success" ? "#2ecc71" : "#e74c3c"}`,
          fontSize: "0.9rem"
        }}>
          {message.text}
        </div>
      )}

      <div style={{ 
        background: "rgba(0,0,0,0.2)", 
        borderRadius: "8px", 
        border: "1px solid rgba(255,255,255,0.05)",
        overflow: "hidden"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead style={{ background: "rgba(255,255,255,0.05)" }}>
            <tr>
              <th style={{ textAlign: "left", padding: "0.75rem 1rem" }}>Dateiname</th>
              <th style={{ textAlign: "left", padding: "0.75rem 1rem" }}>Größe</th>
              <th style={{ textAlign: "left", padding: "0.75rem 1rem" }}>Erstellt am</th>
              <th style={{ textAlign: "right", padding: "0.75rem 1rem" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {backups.map(file => (
              <tr key={file.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "0.75rem 1rem" }}>{file.name}</td>
                <td style={{ padding: "0.75rem 1rem", opacity: 0.7 }}>{formatSize(file.size)}</td>
                <td style={{ padding: "0.75rem 1rem", opacity: 0.7 }}>
                  {isMounted ? new Date(file.createdTime).toLocaleString("de-DE") : "..."}
                </td>
                <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#2ecc71" }}>
                  ● Google Drive
                </td>
              </tr>
            ))}
            {backups.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>
                  Bisher keine Backups gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
