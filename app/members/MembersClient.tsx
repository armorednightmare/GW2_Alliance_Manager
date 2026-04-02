"use client";
import Link from "next/link";
import React, { useState, useMemo } from "react";
import "./Members.css";

// Basic type matching prisma query response
type MemberWithGuild = {
  id: string;
  accountName: string;
  status: string;
  guild?: { name: string, tag: string, isAllianceGuild: boolean } | null;
  subGuild?: { name: string, tag: string, isAllianceGuild: boolean } | null;
  rank?: string | null;
  wvwMember: boolean;
  isAllianceMember: boolean;
  manualRole?: string | null;
  [key: string]: any;
};

export default function MembersClient({ initialMembers }: { initialMembers: MemberWithGuild[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [sortField, setSortField] = useState<string>("accountName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredMembers = useMemo(() => {
    let filtered = initialMembers || [];

    if (statusFilter !== "ALL") {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(m => 
        m.accountName.toLowerCase().includes(s) || 
        (m.guild?.tag && m.guild.tag.toLowerCase().includes(s)) ||
        (m.subGuild?.tag && m.subGuild.tag.toLowerCase().includes(s)) ||
        (m.rank && m.rank.toLowerCase().includes(s)) ||
        (m.manualRole && m.manualRole.toLowerCase().includes(s))
      );
    }
    
    return filtered.sort((a, b) => {
      let valA: any, valB: any;
      if (sortField === "guildtag") {
        const guildA = a.subGuild || a.guild;
        const guildB = b.subGuild || b.guild;
        valA = guildA?.tag || "";
        valB = guildB?.tag || "";
      } else {
        valA = a[sortField];
        valB = b[sortField];
        if (typeof valA === "boolean") valA = valA ? 1 : 0;
        if (typeof valB === "boolean") valB = valB ? 1 : 0;
        if (valA === null || valA === undefined) valA = "";
        if (valB === null || valB === undefined) valB = "";
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [initialMembers, search, statusFilter, sortField, sortDir]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span style={{opacity: 0.3, marginLeft: '4px', fontSize: '0.8rem'}}>↕</span>;
    return sortDir === "asc" ? <span style={{color: 'var(--accent-color)', marginLeft: '4px', fontSize: '0.8rem'}}>▲</span> : <span style={{color: 'var(--accent-color)', marginLeft: '4px', fontSize: '0.8rem'}}>▼</span>;
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <input 
          type="text" 
          placeholder="Suchen nach Account, Gilde, Rang..." 
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="search-input glass-panel"
        />
        <select
          value={statusFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
          className="search-input glass-panel"
          style={{ cursor: "pointer", background: "#1e1e1e", color: "white" }}
        >
          <option value="ALL" style={{ background: "#1e1e1e" }}>Alle Status</option>
          <option value="ACTIVE" style={{ background: "#1e1e1e" }}>Nur Aktive</option>
          <option value="INACTIVE_LEFT" style={{ background: "#1e1e1e" }}>Nur Inaktive (Verlassen)</option>
        </select>
        <span style={{opacity: 0.7, textShadow: '0 0 5px rgba(255,255,255,0.2)'}}>{filteredMembers.length} Spieler {(filteredMembers.length !== initialMembers.length) ? 'gefiltert' : 'gesamt'}</span>
      </div>

      <div className="table-wrapper">
        <table className="member-table glass-panel">
          <thead>
            <tr>
              <th onClick={() => handleSort("accountName")} style={{cursor:"pointer"}}>Account <SortIcon field="accountName" /></th>
              <th onClick={() => handleSort("status")} style={{cursor:"pointer"}}>Status <SortIcon field="status" /></th>
              <th onClick={() => handleSort("guildtag")} style={{cursor:"pointer"}}>Gilde <SortIcon field="guildtag" /></th>
              <th onClick={() => handleSort("rank")} style={{cursor:"pointer"}}>Rang <SortIcon field="rank" /></th>
              <th onClick={() => handleSort("wvwMember")} style={{cursor:"pointer"}}>WvW Vertreten <SortIcon field="wvwMember" /></th>
              <th onClick={() => handleSort("isAllianceMember")} style={{cursor:"pointer"}}>Allianz <SortIcon field="isAllianceMember" /></th>
              <th onClick={() => handleSort("manualRole")} style={{cursor:"pointer"}}>Rollen <SortIcon field="manualRole" /></th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map(m => {
              const displayGuild = m.subGuild || m.guild;
              
              let displayRank = m.rank || '-';
              if (!m.isAllianceMember && m.rank) {
                displayRank = m.subGuild ? `${m.rank} [${m.subGuild.tag}]` : '-';
              }

              return (
                <tr key={m.id} className={!m.wvwMember && m.status === 'ACTIVE' ? 'row-warning' : ''}>

                  <td><strong>{m.accountName}</strong></td>
                  <td>
                    <span className={`status-badge status-${m.status.toLowerCase()}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    {displayGuild ? `${displayGuild.name} [${displayGuild.tag}]` : '-'}
                  </td>
                  <td>{displayRank}</td>

                  <td>{m.wvwMember ? '✅ Ja' : '❌ Nein'}</td>
                  <td>{m.isAllianceMember ? '✅ Ja' : '❌ Nein'}</td>
                  <td>{m.manualRole || '-'}</td>
                  <td>
                    <Link href={`/members/${m.id}`} className="btn-details">Details</Link>
                  </td>
                </tr>
              );
            })}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                  Keine entsprechenden Mitglieder gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
