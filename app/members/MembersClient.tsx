"use client";
import Link from "next/link";
import React, { useState, useMemo, useEffect } from "react";
import "./Members.css";
import { useLanguage } from "../components/LanguageContext";

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
  invitedBy?: string | null;
  comment?: string | null;
  customDiscordName?: string | null;
  linkedUser?: { name?: string; discordId?: string } | null;
  [key: string]: any;
};

type ColumnKey = "accountName" | "status" | "guilds" | "wvwMember" | "isAllianceMember" | "manualRole" | "discordName" | "invitedBy" | "comment";

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  accountName: true,
  status: true,
  guilds: true,
  wvwMember: true,
  isAllianceMember: true,
  manualRole: true,
  discordName: false,
  invitedBy: false,
  comment: false,
};

const STORAGE_KEY = "gw2_members_visible_columns";

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

  // Visible Columns State & LocalStorage sync
  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [showColPicker, setShowColPicker] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setVisibleCols(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error("Failed to load column settings from localStorage:", e);
    }
  }, []);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleCols(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save column settings to localStorage:", e);
      }
      return updated;
    });
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
  const [colSearchDiscord, setColSearchDiscord] = useState("");
  const [colSearchInvitedBy, setColSearchInvitedBy] = useState("");
  const [colSearchComment, setColSearchComment] = useState("");

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
    if (colSearchDiscord.trim()) {
      filtered = filtered.filter(m => {
        const dName = m.customDiscordName || m.linkedUser?.name || "";
        return dName.toLowerCase().includes(colSearchDiscord.toLowerCase());
      });
    }
    if (colSearchInvitedBy.trim()) {
      filtered = filtered.filter(m => m.invitedBy?.toLowerCase().includes(colSearchInvitedBy.toLowerCase()));
    }
    if (colSearchComment.trim()) {
      filtered = filtered.filter(m => m.comment?.toLowerCase().includes(colSearchComment.toLowerCase()));
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
        if (globalSearchFields.discordName) {
          const dName = m.customDiscordName || m.linkedUser?.name || "";
          if (dName.toLowerCase().includes(s)) match = true;
        }
        return match;
      });
    }
    
    return filtered.sort((a, b) => {
      let valA: any, valB: any;
      if (sortField === "guildtag") {
        valA = a.guilds?.[0]?.tag || "";
        valB = b.guilds?.[0]?.tag || "";
      } else if (sortField === "discordName") {
        valA = a.customDiscordName || a.linkedUser?.name || "";
        valB = b.customDiscordName || b.linkedUser?.name || "";
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
    colSearchAccount, colSearchStatus, colSearchGuild, colSearchGuildExclusive, colSearchWvw, colSearchAlliance, colSearchRole, colSearchDiscord, colSearchInvitedBy, colSearchComment,
    globalSearch, globalSearchFields
  ]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span style={{opacity: 0.3, marginLeft: '4px', fontSize: '0.8rem'}}>↕</span>;
    return sortDir === "asc" ? <span style={{color: 'var(--accent-color)', marginLeft: '4px', fontSize: '0.8rem'}}>▲</span> : <span style={{color: 'var(--accent-color)', marginLeft: '4px', fontSize: '0.8rem'}}>▼</span>;
  };

  const toggleGlobalField = (field: keyof typeof globalSearchFields) => {
    setGlobalSearchFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const visibleCount = Object.values(visibleCols).filter(Boolean).length + 1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)", margin: 0 }}>{t("membersTitle")}</h1>
        
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button 
            onClick={() => setShowColPicker(!showColPicker)}
            className="btn-details glass-panel"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', background: showColPicker ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)', color: showColPicker ? 'var(--bg-color)' : 'white' }}
          >
            ⚙️ {t("selectColumns")}
          </button>
          
          <button 
            onClick={() => setShowGlobalSearch(!showGlobalSearch)}
            className="btn-details glass-panel"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', background: showGlobalSearch ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)', color: showGlobalSearch ? 'var(--bg-color)' : 'white' }}
          >
            🔍 {t("globalSearch")}
          </button>
        </div>
      </div>
      <p style={{ opacity: 0.8, marginBottom: "1.5rem", marginTop: "0.5rem" }}>
        {t("membersIntro")}{getSubtitle()}
      </p>

      {/* Column Customizer Panel */}
      {showColPicker && (
        <div className="glass-panel" style={{ padding: "1.2rem", marginBottom: "1.5rem", borderLeft: "4px solid #5865F2", animation: "fadeIn 0.3s ease" }}>
          <h4 style={{ margin: "0 0 0.8rem 0", opacity: 0.9 }}>{t("selectColumns")}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', fontSize: '0.9rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleCols.accountName} onChange={() => toggleColumn('accountName')} /> {t("columnAccount")}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleCols.status} onChange={() => toggleColumn('status')} /> {t("columnStatus")}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleCols.guilds} onChange={() => toggleColumn('guilds')} /> {t("columnGuilds")}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleCols.wvwMember} onChange={() => toggleColumn('wvwMember')} /> {t("columnWvw")}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleCols.isAllianceMember} onChange={() => toggleColumn('isAllianceMember')} /> {t("columnAlliance")}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleCols.manualRole} onChange={() => toggleColumn('manualRole')} /> {t("columnRoles")}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleCols.discordName} onChange={() => toggleColumn('discordName')} /> {t("columnDiscord")}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleCols.invitedBy} onChange={() => toggleColumn('invitedBy')} /> {t("columnInvitedBy")}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleCols.comment} onChange={() => toggleColumn('comment')} /> {t("columnComment")}
            </label>
          </div>
        </div>
      )}

      {/* Global Search Panel */}
      {showGlobalSearch && (
        <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--accent-color)", animation: "fadeIn 0.3s ease" }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <input 
              type="text" 
              placeholder={t("searchPlaceholder")}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
      </div>

      <div className="table-wrapper">
        <table className="member-table glass-panel">
          <thead>
            <tr>
              {visibleCols.accountName && (
                <th>
                  <div onClick={() => handleSort("accountName")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnAccount")} <SortIcon field="accountName" /></div>
                  <input type="text" className="col-search-input" placeholder="..." value={colSearchAccount} onChange={e => setColSearchAccount(e.target.value)} />
                </th>
              )}
              {visibleCols.status && (
                <th>
                  <div onClick={() => handleSort("status")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnStatus")} <SortIcon field="status" /></div>
                  <select className="col-search-select" value={colSearchStatus} onChange={e => setColSearchStatus(e.target.value)}>
                    <option value="ALL">{t("allStatuses")}</option>
                    <option value="ACTIVE">{t("onlyActive")}</option>
                    <option value="INACTIVE_LEFT">{t("onlyInactive")}</option>
                  </select>
                </th>
              )}
              {visibleCols.guilds && (
                <th>
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
              )}
              {visibleCols.wvwMember && (
                <th>
                  <div onClick={() => handleSort("wvwMember")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnWvw")} <SortIcon field="wvwMember" /></div>
                  <select className="col-search-select" value={colSearchWvw} onChange={e => setColSearchWvw(e.target.value)}>
                    <option value="ALL">-</option>
                    <option value="YES">{t("yes")}</option>
                    <option value="NO">{t("no")}</option>
                  </select>
                </th>
              )}
              {visibleCols.isAllianceMember && (
                <th>
                  <div onClick={() => handleSort("isAllianceMember")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnAlliance")} <SortIcon field="isAllianceMember" /></div>
                  <select className="col-search-select" value={colSearchAlliance} onChange={e => setColSearchAlliance(e.target.value)}>
                    <option value="ALL">-</option>
                    <option value="YES">{t("yes")}</option>
                    <option value="NO">{t("no")}</option>
                  </select>
                </th>
              )}
              {visibleCols.manualRole && (
                <th>
                  <div onClick={() => handleSort("manualRole")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnRoles")} <SortIcon field="manualRole" /></div>
                  <input type="text" className="col-search-input" placeholder="..." value={colSearchRole} onChange={e => setColSearchRole(e.target.value)} />
                </th>
              )}
              {visibleCols.discordName && (
                <th>
                  <div onClick={() => handleSort("discordName")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnDiscord")} <SortIcon field="discordName" /></div>
                  <input type="text" className="col-search-input" placeholder="..." value={colSearchDiscord} onChange={e => setColSearchDiscord(e.target.value)} />
                </th>
              )}
              {visibleCols.invitedBy && (
                <th>
                  <div onClick={() => handleSort("invitedBy")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnInvitedBy")} <SortIcon field="invitedBy" /></div>
                  <input type="text" className="col-search-input" placeholder="..." value={colSearchInvitedBy} onChange={e => setColSearchInvitedBy(e.target.value)} />
                </th>
              )}
              {visibleCols.comment && (
                <th>
                  <div onClick={() => handleSort("comment")} style={{cursor:"pointer", marginBottom: '8px'}}>{t("columnComment")} <SortIcon field="comment" /></div>
                  <input type="text" className="col-search-input" placeholder="..." value={colSearchComment} onChange={e => setColSearchComment(e.target.value)} />
                </th>
              )}
              <th>{t("columnActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map(m => {
              const effectiveDiscord = m.customDiscordName || m.linkedUser?.name || null;
              return (
                <tr key={m.id} className={!m.wvwMember && m.status === 'ACTIVE' ? 'row-warning' : ''}>
                  {visibleCols.accountName && <td><strong>{m.accountName}</strong></td>}
                  {visibleCols.status && (
                    <td>
                      <span className={`status-badge status-${m.status.toLowerCase()}`}>
                        {m.status}
                      </span>
                    </td>
                  )}
                  {visibleCols.guilds && (
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
                  )}
                  {visibleCols.wvwMember && <td>{m.wvwMember ? `✅ ${t("yes")}` : `❌ ${t("no")}`}</td>}
                  {visibleCols.isAllianceMember && <td>{m.isAllianceMember ? `✅ ${t("yes")}` : `❌ ${t("no")}`}</td>}
                  {visibleCols.manualRole && <td>{m.manualRole || '-'}</td>}
                  {visibleCols.discordName && <td>{effectiveDiscord || '-'}</td>}
                  {visibleCols.invitedBy && <td>{m.invitedBy || '-'}</td>}
                  {visibleCols.comment && (
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.comment || ''}>
                      {m.comment || '-'}
                    </td>
                  )}
                  <td>
                    <Link href={`/members/${m.id}`} className="btn-details">{t("details")}</Link>
                  </td>
                </tr>
              );
            })}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={visibleCount} style={{ textAlign: 'center', padding: '3rem' }}>
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
