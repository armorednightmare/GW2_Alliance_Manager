"use client";
import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { fetchHistoryLogs } from "./actions";

export default function HistoryClient({ initialHistory, initialTotal }: { initialHistory: any[], initialTotal: number }) {
  const highlightedRef = useRef<HTMLTableRowElement | null>(null);

  const [history, setHistory] = useState(initialHistory);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const isFirstMount = useRef(true);

  // Highlight hash logic
  useEffect(() => {
    setIsMounted(true);
    const hash = window.location.hash;
    if (!hash) return;
    const targetId = hash.replace("#", ""); 
    const el = document.getElementById(targetId) as HTMLTableRowElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlighted-row");
      highlightedRef.current = el;
      const timer = setTimeout(() => {
        el.classList.remove("highlighted-row");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync data whenever page, limit, or search change
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    
    // Auto-search delay/debounce could go here, but since it's a simple local app we can just do it instantly
    const delayDebounceFn = setTimeout(() => {
      startTransition(async () => {
        const { data, total: newTotal } = await fetchHistoryLogs(page, limit, search);
        setHistory(data);
        setTotal(newTotal);
      });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [page, limit, search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        
        {/* Left side: Search & Total */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <input 
            type="text" 
            placeholder="Suchen nach Account, Ereignis..." 
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="search-input glass-panel"
            style={{ minWidth: "250px" }}
          />
          <span style={{opacity: 0.7, textShadow: '0 0 5px rgba(255,255,255,0.2)'}}>
            {total} Einträge gefunden {isPending && "(Lädt...)"}
          </span>
        </div>

        {/* Right side: Limit & Pagination */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={limit}
            onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }}
            className="search-input glass-panel"
            style={{ cursor: "pointer", background: "var(--bg-color, #1e1e1e)", color: "white" }}
          >
            <option value={10} style={{ background: "#1e1e1e" }}>10 pro Seite</option>
            <option value={20} style={{ background: "#1e1e1e" }}>20 pro Seite</option>
            <option value={50} style={{ background: "#1e1e1e" }}>50 pro Seite</option>
            <option value={100} style={{ background: "#1e1e1e" }}>100 pro Seite</option>
            <option value={500} style={{ background: "#1e1e1e" }}>500 pro Seite</option>
          </select>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", cursor: page === 1 ? "not-allowed" : "pointer", background: "rgba(255,255,255,0.1)", border: "none", color: "white", opacity: page === 1 ? 0.4 : 1 }}
            >
              Vorherige
            </button>
            <span style={{ fontSize: "0.9rem", padding: "0 0.5rem" }}>Seite {page} von {totalPages}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page >= totalPages}
              style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", cursor: page >= totalPages ? "not-allowed" : "pointer", background: "rgba(255,255,255,0.1)", border: "none", color: "white", opacity: page >= totalPages ? 0.4 : 1 }}
            >
              Nächste
            </button>
          </div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "3rem", opacity: 0.9, borderRadius: "12px" }}>
          {isPending ? "Suche läuft..." : "Keine Historien-Einträge gefunden."}
        </div>
      ) : (
        <div style={{ opacity: isPending ? 0.5 : 1, transition: "opacity 0.2s" }} className="table-wrapper">
          <table className="member-table glass-panel" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "1.2rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Datum</th>
                <th style={{ textAlign: "left", padding: "1.2rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Account</th>
                <th style={{ textAlign: "left", padding: "1.2rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Ereignis</th>
                <th style={{ textAlign: "left", padding: "1.2rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Details</th>
                <th style={{ textAlign: "left", padding: "1.2rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h: any) => (
                <tr key={h.id} id={`hist-${h.id}`}>
                  <td style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {isMounted ? new Date(h.createdAt).toLocaleString("de-DE") : "..."}
                  </td>
                  <td style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <strong>{h.member?.accountName || "Unbekannt"}</strong>
                    {h.member?.guilds?.map((mg: any) => (
                      <span key={mg.id} style={{ opacity: 0.6, marginLeft: "5px" }}>[{mg.guild.tag}]</span>
                    ))}
                  </td>
                  <td style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ 
                      padding: "0.3rem 0.6rem", 
                      borderRadius: "6px", 
                      backgroundColor: "var(--primary-color)",
                      fontSize: "0.85rem",
                      fontWeight: "bold",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                      ...(h.eventType === "LEFT" || h.eventType === "KICKED" ? { backgroundColor: "rgba(231, 76, 60, 0.5)" } : {})
                    }}>
                      {h.eventType}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {h.oldValue ? <span style={{ textDecoration: "line-through", opacity: 0.5, marginRight: "5px" }}>{h.oldValue}</span> : null}
                    {h.newValue ? <span style={{ color: "var(--accent-color)" }}>{h.newValue}</span> : "-"}
                  </td>
                  <td style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {h.memberId && h.member && (
                      <Link href={`/members/${h.memberId}`} className="btn-details">Profil</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

