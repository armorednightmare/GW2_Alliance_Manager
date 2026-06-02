"use client";
import Link from "next/link";
import React, { useState, useMemo } from "react";
import "./Members.css";
import { useLanguage } from "../components/LanguageContext";

// Basic type matching Firestore query response
// Basic type matching Firestore query response
type MemberGuild = {
  id: string;
  name: string;
  tag: string;
  rank: string;
  isAllianceGuild?: boolean;
};

type MemberWithGuilds = {
  id: string;
  accountName: string;
  status: string;
  guilds: MemberGuild[];
  wvwMember: boolean;
  isAllianceMember: boolean;
  manualRole?: string | null;
  [key: string]: any;
};

export default function MembersClient({ 
  initialMembers, 
  userRole, 
  allianceGuildId 
}: { 
  initialMembers: MemberWithGuilds[]; 
  userRole?: string; 
  allianceGuildId?: string | null; 
}) {
  const { t } = useLanguage();

  const getSubtitle = () => {
    if (userRole === "ALLIANCE_LEADER") return t("membersSubtitleAllianceLeader");
    if (userRole === "GUILD_LEADER" || userRole === "ADMIN") return t("membersSubtitleAdmin");
    return t("membersSubtitleDefault");
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [guildFilter, setGuildFilter] = useState("ALL");
  const [sortField, setSortField] = useState<string>("accountName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Extract unique guilds for the filter dropdown
  const uniqueGuilds = useMemo(() => {
    const guildsMap = new Map<string, string>(); // Tag -> Name
    initialMembers.forEach(m => {
      m.guilds?.forEach(mg => {
        if (mg.tag) {
          guildsMap.set(mg.tag, mg.name || mg.tag);
        }
      });
    });
    return Array.from(guildsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [initialMembers]);

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
      if (statusFilter === "INACTIVE_LEFT") {
        filtered = filtered.filter(m => m.status === "INACTIVE_LEFT" || m.status === "INACTIVE_KICKED");
      } else {
        filtered = filtered.filter(m => m.status === statusFilter);
      }
    }

    if (guildFilter !== "ALL") {
      filtered = filtered.filter(m => 
        m.guilds?.some(mg => mg.tag === guildFilter)
      );
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(m => 
        m.accountName.toLowerCase().includes(s) || 
        (m.invitedBy && m.invitedBy.toLowerCase().includes(s)) ||
        m.guilds.some(mg => 
          mg.name?.toLowerCase().includes(s) || 
          mg.tag?.toLowerCase().includes(s) || 
          mg.rank.toLowerCase().includes(s)
        ) ||
        (m.manualRole && m.manualRole.toLowerCase().includes(s))
      );
    }
    
    return filtered.sort((a, b) => {
      let valA: any, valB: any;
      if (sortField === "guildtag") {
        // Sort by the first guild tag found
        valA = a.guilds?.[0]?.tag || "";
        valB = b.guilds?.[0]?.tag || "";
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
  }, [initialMembers, search, statusFilter, guildFilter, sortField, sortDir]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span style={{opacity: 0.3, marginLeft: '4px', fontSize: '0.8rem'}}>↕</span>;
    return sortDir === "asc" ? <span style={{color: 'var(--accent-color)', marginLeft: '4px', fontSize: '0.8rem'}}>▲</span> : <span style={{color: 'var(--accent-color)', marginLeft: '4px', fontSize: '0.8rem'}}>▼</span>;
  };

  return (
    <div>
      <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)" }}>{t("membersTitle")}</h1>
      <p style={{ opacity: 0.8, marginBottom: "1.5rem" }}>
        {t("membersIntro")}{getSubtitle()}
      </p>

      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <input 
          type="text" 
          placeholder={t("searchPlaceholder")}
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
          <option value="ALL" style={{ background: "#1e1e1e" }}>{t("allStatuses")}</option>
          <option value="ACTIVE" style={{ background: "#1e1e1e" }}>{t("onlyActive")}</option>
          <option value="INACTIVE_LEFT" style={{ background: "#1e1e1e" }}>{t("onlyInactive")}</option>
        </select>
        
        <select
          value={guildFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGuildFilter(e.target.value)}
          className="search-input glass-panel"
          style={{ cursor: "pointer", background: "#1e1e1e", color: "white" }}
        >
          <option value="ALL" style={{ background: "#1e1e1e" }}>{t("allGuilds")}</option>
          {uniqueGuilds.map(([tag, name]) => (
            <option key={tag} value={tag} style={{ background: "#1e1e1e" }}>
              [{tag}] {name}
            </option>
          ))}
        </select>
        <span style={{opacity: 0.7, textShadow: '0 0 5px rgba(255,255,255,0.2)'}}>{filteredMembers.length} {(filteredMembers.length !== initialMembers.length) ? t("playersFiltered") : t("playersTotal")}</span>
      </div>

      <div className="table-wrapper">
        <table className="member-table glass-panel">
          <thead>
            <tr>
              <th onClick={() => handleSort("accountName")} style={{cursor:"pointer"}}>{t("columnAccount")} <SortIcon field="accountName" /></th>
              <th onClick={() => handleSort("status")} style={{cursor:"pointer"}}>{t("columnStatus")} <SortIcon field="status" /></th>
              <th>{t("columnGuilds")}</th>
              <th onClick={() => handleSort("wvwMember")} style={{cursor:"pointer"}}>{t("columnWvw")} <SortIcon field="wvwMember" /></th>
              <th onClick={() => handleSort("isAllianceMember")} style={{cursor:"pointer"}}>{t("columnAlliance")} <SortIcon field="isAllianceMember" /></th>
              <th onClick={() => handleSort("manualRole")} style={{cursor:"pointer"}}>{t("columnRoles")} <SortIcon field="manualRole" /></th>
              <th>{t("columnActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map(m => {
              return (
                <tr key={m.id} className={!m.wvwMember && m.status === 'ACTIVE' ? 'row-warning' : ''}>

                  <td><strong>{m.accountName}</strong></td>
                  <td>
                    <span className={`status-badge status-${m.status.toLowerCase()}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                      {m.guilds?.map((mg, idx) => {
                        const isAlliance = mg.isAllianceGuild || mg.id === allianceGuildId;
                        return (
                          <div key={idx} style={{ opacity: isAlliance ? 1 : 0.8 }}>
                            <span style={{ fontWeight: isAlliance ? 'bold' : 'normal' }}>
                              [{mg.tag || '???'}]
                            </span>
                            <span style={{ marginLeft: '6px', opacity: 0.7 }}>{mg.rank}</span>
                          </div>
                        );
                      })}
                      {(!m.guilds || m.guilds.length === 0) && '-'}
                    </div>
                  </td>

                  <td>{m.wvwMember ? `✅ ${t("yes")}` : `❌ ${t("no")}`}</td>
                  <td>{m.isAllianceMember ? `✅ ${t("yes")}` : `❌ ${t("no")}`}</td>
                  <td>{m.manualRole || '-'}</td>
                  <td>
                    <Link href={`/members/${m.id}`} className="btn-details">{t("details")}</Link>
                  </td>
                </tr>
              );
            })}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                  {t("noMembersFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
