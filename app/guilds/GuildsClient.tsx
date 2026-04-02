"use client";
import { useState, useMemo } from "react";

type GuildStat = {
  id: string;
  name: string;
  tag: string;
  isAllianceGuild: boolean;
  hasLeaderToken: boolean;
  totalActive: number;
  wvwActive: number;
  [key: string]: any;
};

export default function GuildsClient({ initialGuilds, totalAllianceMembers }: { initialGuilds: GuildStat[], totalAllianceMembers: number }) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredGuilds = useMemo(() => {
    let filtered = initialGuilds || [];
    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(g => 
        g.name.toLowerCase().includes(s) || 
        g.tag.toLowerCase().includes(s)
      );
    }
    
    return [...filtered].sort((a, b) => {
      // Primary sort: Alliance guild always at top
      if (a.isAllianceGuild && !b.isAllianceGuild) return -1;
      if (!a.isAllianceGuild && b.isAllianceGuild) return 1;

      // Secondary sort: User selected field
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (typeof valA === "boolean") valA = valA ? 1 : 0;
      if (typeof valB === "boolean") valB = valB ? 1 : 0;
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [initialGuilds, search, sortField, sortDir]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span style={{opacity: 0.3, marginLeft: '4px', fontSize: '0.8rem'}}>↕</span>;
    return sortDir === "asc" ? <span style={{color: 'var(--accent-color)', marginLeft: '4px', fontSize: '0.8rem'}}>▲</span> : <span style={{color: 'var(--accent-color)', marginLeft: '4px', fontSize: '0.8rem'}}>▼</span>;
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <input 
          type="text" 
          placeholder="Suchen nach Name, Tag..." 
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          className="search-input glass-panel"
        />
        <span style={{opacity: 0.7, textShadow: '0 0 5px rgba(255,255,255,0.2)'}}>{filteredGuilds.length} Gilden {(filteredGuilds.length !== initialGuilds.length) ? 'gefiltert' : 'gesamt'}</span>
      </div>

      <div className="table-wrapper">
        <table className="member-table glass-panel">
          <thead>
            <tr>
              <th onClick={() => handleSort("name")} style={{cursor:"pointer"}}>Gilde <SortIcon field="name" /></th>
              <th onClick={() => handleSort("hasLeaderToken")} style={{cursor:"pointer"}}>Sync-Status <SortIcon field="hasLeaderToken" /></th>
              <th onClick={() => handleSort("totalActive")} style={{cursor:"pointer", textAlign:"right"}}>Aktive Spieler <SortIcon field="totalActive" /></th>
              <th onClick={() => handleSort("wvwActive")} style={{cursor:"pointer", textAlign:"right"}}>WvW Vertreten <SortIcon field="wvwActive" /></th>
              <th style={{textAlign:"right"}}>Anteil zur Allianz</th>
            </tr>
          </thead>
          <tbody>
            {filteredGuilds.map((g: any) => {
              const allianceShare = totalAllianceMembers > 0 ? Math.round((g.wvwActive / totalAllianceMembers) * 100) : 0;
              return (
                <tr key={g.id} style={g.isAllianceGuild ? { background: 'rgba(102,252,241,0.05)' } : {}}>
                  <td>
                    {g.isAllianceGuild && <span style={{ marginRight: '8px', color: 'var(--accent-color)' }} title="Haupt-Allianzgilde">⚔️</span>}
                    <strong>{g.name}</strong> <span className="guild-tag" style={{opacity: 0.6}}>[{g.tag}]</span>
                  </td>
                  <td>{g.hasLeaderToken ? '✅ API-Key hinterlegt' : '❌ Kein API-Key'}</td>
                  <td style={{textAlign:"right", fontFamily: "monospace", fontSize: "1.1rem"}}>{g.totalActive}</td>
                  <td style={{textAlign:"right", fontFamily: "monospace", fontSize: "1.1rem"}}>{g.wvwActive}</td>
                  <td style={{textAlign:"right", width: "200px"}}>
                    <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.1)', width: '100px', height: '10px', borderRadius: '5px', overflow: 'hidden', verticalAlign: 'middle', marginRight: '10px' }}>
                      <div style={{ backgroundColor: 'var(--accent-color)', width: `${allianceShare}%`, height: '100%' }}></div>
                    </div>
                    {allianceShare}%
                  </td>
                </tr>
              );
            })}
            {filteredGuilds.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>
                  Keine entsprechenden Gilden gefunden. Um eine Gilde hinzuzufügen, müssen in den Datenbank-Settings entsprechende API-Keys eingefügt werden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
