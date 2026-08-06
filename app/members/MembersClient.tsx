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

  // Sort State
  const [sortField, setSortField] = useState<string>("accountName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Global Search State
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSearchFields, setGlobalSearchFields] = useState({
    accountName: true,
    guilds: true,
    status: false,
    invitedBy: true,
    manualRole: true,
    comment: true,
    discordName: true
  });

  // Column Filter State
  const [colSearchAccount, setColSearchAccount] = useState("");
  const [colSearchStatus, setColSearchStatus] = useState("ALL");
  const [colSearchGuild, setColSearchGuild] = useState("ALL");
  const [colSearchGuildExclusive, setColSearchGuildExclusive] = useState(false);
  const [colSearchWvw, setColSearchWvw] = useState("ALL");
  const [colSearchAlliance, setColSearchAlliance] = useState("ALL");
  const [colSearchRole, setColSearchRole] = useState("");

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

    // Column Filters
    if (colSearchAccount.trim()) {
      filtered = filtered.filter(m => m.accountName.toLowerCase().includes(colSearchAccount.toLowerCase()));
    }
    if (colSearchStatus !== "ALL") {
      if (colSearchStatus === "INACTIVE_LEFT") {
        filtered = filtered.filter(m => m.status === "INACTIVE_LEFT" || m.status === "INACTIVE_KICKED");
      } else {
        filtered = filtered.filter(m => m.status === colSearchStatus);
      }
    }
    if (colSearchGuild !== "ALL") {
      filtered = filtered.filter(m => {
        const isInGuild = m.guilds?.some(mg => mg.tag === colSearchGuild);
        if (colSearchGuildExclusive) {
          return isInGuild && (m.guilds?.length === 1);
        }
        return isInGuild;
      });
    }
    if (colSearchWvw !== "ALL") {
      const isWvw = colSearchWvw === "YES";
      filtered = filtered.filter(m => m.wvwMember === isWvw);
    }
    if (colSearchAlliance !== "ALL") {
      const isAlliance = colSearchAlliance === "YES";
      filtered = filtered.filter(m => m.isAllianceMember === isAlliance);
    }
    if (colSearchRole.trim()) {
      filtered = filtered.filter(m => m.manualRole?.toLowerCase().includes(colSearchRole.toLowerCase()));
    }

    // Global Search
    if (globalSearch.trim()) {
      const s = globalSearch.toLowerCase();
      filtered = filtered.filter(m => {
        let match = false;
        if (globalSearchFields.accountName && m.accountName.toLowerCase().includes(s)) match = true;
        if (globalSearchFields.guilds && m.guilds?.some((mg: any) => mg.name?.toLowerCase().includes(s) || mg.tag?.toLowerCase().includes(s) || mg.rank.toLowerCase().includes(s))) match = true;
        if (globalSearchFields.status && m.status.toLowerCase().includes(s)) match = true;
        if (globalSearchFields.invitedBy && m.invitedBy?.toLowerCase().includes(s)) match = true;
        if (globalSearchFields.manualRole && m.manualRole?.toLowerCase().includes(s)) match = true;
        if (globalSearchFields.comment && m.comment?.toLowerCase().includes(s)) match = true;
        if (globalSearchFields.discordName && m.customDiscordName?.toLowerCase().includes(s)) match = true;
        return match;
      });
    }
    
    return filtered.sort((a, b) => {
      let valA: any, valB: any;
      if (sortField === "guildtag") {
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
  }, [
    initialMembers, 
    sortField, sortDir, 
    colSearchAccount, colSearchStatus, colSearchGuild, colSearchGuildExclusive, colSearchWvw, colSearchAlliance, colSearchRole,
    globalSearch, globalSearchFields
  ]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span style={{opacity: 0.3, marginLeft: '4px', fontSize: '0.8rem'}}>↕</span>;
    return sortDir === "asc" ? <span style={{color: 'var(--accent-color)', marginLeft: '4px', fontSize: '0.8rem'}}>▲</span> : <span style={{color: 'var(--accent-color)', marginLeft: '4px', fontSize: '0.8rem'}}>▼</span>;
  };

  const toggleGlobalField = (field: keyof typeof globalSearchFields) => {
    setGlobalSearchFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)", margin: 0 }}>{t("membersTitle")}</h1>
        <button 
          onClick={() => setShowGlobalSearch(!showGlobalSearch)}
          className="btn-details glass-panel"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', padding: '0.6rem 1.2rem', background: showGlobalSearch ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)', color: showGlobalSearch ? 'var(--bg-color)' : 'white' }}
        >
          🔍 {t("globalSearch") || "Erweiterte Suche"}
        </button>
      </div>
      <p style={{ opacity: 0.8, marginBottom: "1.5rem", marginTop: "0.5rem" }}>
        {t("membersIntro")}{getSubtitle()}
      </p>

      {/* Global Search Panel */}
      {showGlobalSearch && (
        <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--accent-color)", animation: "fadeIn 0.3s ease" }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <input 
              type="text" 
              placeholder={t("searchPlaceholder")}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="search-input glass-panel"
              style={{ flex: 1, maxWidth: '100%' }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.9rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={globalSearchFields.accountName} onChange={() => toggleGlobalField('accountName')} /> Account
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={globalSearchFields.guilds} onChange={() => toggleGlobalField('guilds')} /> Gilden
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={globalSearchFields.status} onChange={() => toggleGlobalField('status')} /> Status
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={globalSearchFields.invitedBy} onChange={() => toggleGlobalField('invitedBy')} /> Eingeladen von
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={globalSearchFields.manualRole} onChange={() => toggleGlobalField('manualRole')} /> Rollen
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={globalSearchFields.comment} onChange={() => toggleGlobalField('comment')} /> Kommentare
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={globalSearchFields.discordName} onChange={() => toggleGlobalField('discordName')} /> Discord Name
            </label>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{opacity: 0.7, textShadow: '0 0 5px rgba(255,255,255,0.2)'}}>{filteredMembers.length} {(filteredMembers.length !== initialMembers.length) ? t("playersFiltered") : t("playersTotal")}</span>
      </div>

      <div className="table-wrapper">
        <table className="member-table glass-panel">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>
                <div onClick={() => handleSort("accountName")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnAccount")} <SortIcon field="accountName" /></div>
                <input type="text" className="col-search-input" placeholder="..." value={colSearchAccount} onChange={e => setColSearchAccount(e.target.value)} />
              </th>
              <th style={{ width: '12%' }}>
                <div onClick={() => handleSort("status")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnStatus")} <SortIcon field="status" /></div>
                <select className="col-search-select" value={colSearchStatus} onChange={e => setColSearchStatus(e.target.value)}>
                  <option value="ALL">{t("allStatuses")}</option>
                  <option value="ACTIVE">{t("onlyActive")}</option>
                  <option value="INACTIVE_LEFT">{t("onlyInactive")}</option>
                </select>
              </th>
              <th style={{ width: '20%' }}>
                <div style={{ marginBottom: '8px' }}>{t("columnGuilds")}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <select className="col-search-select" value={colSearchGuild} onChange={e => setColSearchGuild(e.target.value)}>
                    <option value="ALL">{t("allGuilds")}</option>
                    {uniqueGuilds.map(([tag, name]) => (
                      <option key={tag} value={tag}>[{tag}] {name}</option>
                    ))}
                  </select>
                  {colSearchGuild !== "ALL" && (
                    <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: 0.8 }}>
                      <input type="checkbox" checked={colSearchGuildExclusive} onChange={e => setColSearchGuildExclusive(e.target.checked)} />
                      Nur exklusive
                    </label>
                  )}
                </div>
              </th>
              <th style={{ width: '10%' }}>
                <div onClick={() => handleSort("wvwMember")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnWvw")} <SortIcon field="wvwMember" /></div>
                <select className="col-search-select" value={colSearchWvw} onChange={e => setColSearchWvw(e.target.value)}>
                  <option value="ALL">-</option>
                  <option value="YES">{t("yes")}</option>
                  <option value="NO">{t("no")}</option>
                </select>
              </th>
              <th style={{ width: '10%' }}>
                <div onClick={() => handleSort("isAllianceMember")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnAlliance")} <SortIcon field="isAllianceMember" /></div>
                <select className="col-search-select" value={colSearchAlliance} onChange={e => setColSearchAlliance(e.target.value)}>
                  <option value="ALL">-</option>
                  <option value="YES">{t("yes")}</option>
                  <option value="NO">{t("no")}</option>
                </select>
              </th>
              <th style={{ width: '15%' }}>
                <div onClick={() => handleSort("manualRole")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnRoles")} <SortIcon field="manualRole" /></div>
                <input type="text" className="col-search-input" placeholder="..." value={colSearchRole} onChange={e => setColSearchRole(e.target.value)} />
              </th>
              <th style={{ width: '10%' }}>{t("columnActions")}</th>
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
                      {m.guilds?.map((mg: any, idx: number) => {
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
