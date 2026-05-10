"use client";
import React, { useState, useMemo } from "react";

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

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  stats: any | null;
}

export default function GuildsClient({ initialGuilds, totalWvwMembers, members, allGuilds }: { initialGuilds: GuildStat[], totalWvwMembers: number, members: any[], allGuilds: any[] }) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, stats: null });

  // Pie chart calculation
  const { chartSegments, andereStats, totalWvwSum } = useMemo(() => {
    const subGuilds = allGuilds.filter(g => !g.isAllianceGuild);
    const colors = [
      "#66FCF1", "#e67e22", "#9b59b6", "#2ecc71", "#e74c3c",
      "#3498db", "#f1c40f", "#1abc9c", "#e91e63", "#ff9800"
    ];

    const subGuildIds = new Set(subGuilds.map(g => g.id));

    const result = subGuilds.map((g, i) => {
      const wvwInGuild = members.filter(m =>
        m.status === "ACTIVE" &&
        m.wvwMember &&
        (m.guilds || []).some((mg: any) => mg.id === g.id)
      );

      let wvwExclusive = 0;
      let wvwOverlap = 0;
      const overlapDetails: Record<string, number> = {};

      wvwInGuild.forEach(m => {
        const otherSubs = (m.guilds || []).filter((mg: any) =>
          mg.id !== g.id && subGuildIds.has(mg.id)
        );
        if (otherSubs.length === 0) {
          wvwExclusive++;
        } else {
          wvwOverlap++;
          otherSubs.forEach((og: any) => {
            overlapDetails[og.id] = (overlapDetails[og.id] || 0) + 1;
          });
        }
      });

      return {
        id: g.id,
        name: g.name,
        tag: g.tag,
        wvwTotal: wvwInGuild.length,
        wvwExclusive,
        wvwOverlap,
        overlapDetails,
        color: colors[i % colors.length],
        isAndere: false
      };
    }).filter(s => s.wvwTotal > 0);

    const andereWvw = members.filter(m =>
      m.status === "ACTIVE" &&
      m.wvwMember &&
      m.isAllianceMember &&
      !(m.guilds || []).some((mg: any) => subGuildIds.has(mg.id))
    );
    
    const andereAll = members.filter(m =>
      m.status === "ACTIVE" &&
      m.isAllianceMember &&
      !(m.guilds || []).some((mg: any) => subGuildIds.has(mg.id))
    );

    const andereStats = andereWvw.length > 0 ? {
      id: "andere",
      name: "Andere",
      tag: "???",
      wvwTotal: andereWvw.length,
      totalMembers: andereAll.length,
      wvwExclusive: andereWvw.length,
      wvwOverlap: 0,
      overlapDetails: {} as Record<string, number>,
      color: "#555e6e",
      isAndere: true
    } : null;

    const stats = result.sort((a, b) => b.wvwTotal - a.wvwTotal);
    const allSegments = andereStats ? [...stats, andereStats] : stats;
    const totalWvwSum = allSegments.reduce((sum, s) => sum + s.wvwTotal, 0);

    return { chartSegments: allSegments, andereStats, totalWvwSum };
  }, [members, allGuilds]);

  const hoveredChartStats = chartSegments.find(s => s.id === hoveredId) || null;

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

      // Force "andere" to the very bottom
      if (a.id === "andere" && b.id !== "andere") return 1;
      if (a.id !== "andere" && b.id === "andere") return -1;

      // Secondary sort
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

  // Pie chart math
  let cumulativePercent = -0.25;
  function getCoord(percent: number) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, s: any) => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      stats: s
    });
    setHoveredId(s.id);
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, stats: null });
    setHoveredId(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Search Bar */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <input 
          type="text" 
          placeholder="Suchen nach Name, Tag..." 
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          className="search-input glass-panel"
        />
        <span style={{opacity: 0.7, textShadow: '0 0 5px rgba(255,255,255,0.2)'}}>{filteredGuilds.length} Gilden {(filteredGuilds.length !== initialGuilds.length) ? 'gefiltert' : 'gesamt'}</span>
      </div>

      <div style={{ display: "flex", gap: "3rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        
        {/* Table (Left Side) */}
        <div className="table-wrapper" style={{ flex: "1 1 600px", margin: 0 }}>
          <table className="member-table glass-panel">
            <thead>
              <tr>
                <th onClick={() => handleSort("name")} style={{cursor:"pointer"}}>Gilde <SortIcon field="name" /></th>
                <th onClick={() => handleSort("hasLeaderToken")} style={{cursor:"pointer"}}>Sync-Status <SortIcon field="hasLeaderToken" /></th>
                <th onClick={() => handleSort("totalActive")} style={{cursor:"pointer", textAlign:"right"}}>Aktive Spieler <SortIcon field="totalActive" /></th>
                <th onClick={() => handleSort("wvwActive")} style={{cursor:"pointer", textAlign:"right"}}>WvW Vertreten <SortIcon field="wvwActive" /></th>
                <th style={{textAlign:"right"}}>Anteil (WvW)</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuilds.filter((g: any) => !g.isAllianceGuild).map((g: any) => {
                const wvwShare = totalWvwMembers > 0 ? Math.round((g.wvwActive / totalWvwMembers) * 100) : 0;
                const chartInfo = chartSegments.find(s => s.id === g.id);
                const color = chartInfo ? chartInfo.color : "transparent";
                
                // Highlight row if pie chart overlaps with this guild, or if hovered
                const isHovered = hoveredId === g.id;
                const isLinkedOverlap = !!(hoveredChartStats && !hoveredChartStats.isAndere && hoveredChartStats.overlapDetails[g.id as string]);
                
                return (
                  <tr 
                    key={g.id} 
                    onMouseEnter={() => setHoveredId(g.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{ 
                      background: isHovered ? "rgba(102, 252, 241, 0.1)" : isLinkedOverlap ? "rgba(102, 252, 241, 0.04)" : "transparent",
                      transition: "background 0.2s"
                    }}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: color, flexShrink: 0, opacity: chartInfo ? 1 : 0 }} />
                        <div>
                          <strong>{g.name}</strong> <span className="guild-tag" style={{opacity: 0.6}}>[{g.tag}]</span>
                        </div>
                      </div>
                    </td>
                    <td>{g.hasLeaderToken ? '✅ API-Key hinterlegt' : (g.id !== "andere" ? '❌ Kein API-Key' : '')}</td>
                    <td style={{textAlign:"right", fontFamily: "monospace", fontSize: "1.1rem"}}>{g.totalActive}</td>
                    <td style={{textAlign:"right", fontFamily: "monospace", fontSize: "1.1rem"}}>{g.wvwActive}</td>
                    <td style={{textAlign:"right", width: "200px"}}>
                      <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.1)', width: '100px', height: '10px', borderRadius: '5px', overflow: 'hidden', verticalAlign: 'middle', marginRight: '10px' }}>
                        <div style={{ backgroundColor: color !== "transparent" ? color : 'var(--accent-color)', width: `${wvwShare}%`, height: '100%' }}></div>
                      </div>
                      <span style={{ color: color !== "transparent" ? color : 'inherit', fontWeight: 'bold' }}>{wvwShare}%</span>
                    </td>
                  </tr>
                );
              })}
              
              {filteredGuilds.filter((g: any) => g.isAllianceGuild).length > 0 && filteredGuilds.filter((g: any) => !g.isAllianceGuild).length > 0 && (
                <tr style={{ height: '3rem', background: 'transparent' }}>
                  <td colSpan={5} style={{ borderBottom: 'none', padding: 0 }}></td>
                </tr>
              )}

              {filteredGuilds.filter((g: any) => g.isAllianceGuild).map((g: any) => {
                const wvwShare = totalWvwMembers > 0 ? Math.round((g.wvwActive / totalWvwMembers) * 100) : 0;
                return (
                  <tr key={g.id} style={{ background: 'rgba(102,252,241,0.08)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                    <td style={{ borderBottom: '2px solid rgba(102,252,241,0.3)', borderTop: '2px solid rgba(102,252,241,0.3)' }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                         <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "transparent", flexShrink: 0 }} />
                         <div>
                           <span style={{ marginRight: '8px', color: 'var(--accent-color)' }} title="Haupt-Allianzgilde">⚔️</span>
                           <strong style={{ fontSize: '1.05rem' }}>{g.name}</strong> <span className="guild-tag" style={{opacity: 0.8}}>[{g.tag}]</span>
                         </div>
                      </div>
                    </td>
                    <td style={{ borderBottom: '2px solid rgba(102,252,241,0.3)', borderTop: '2px solid rgba(102,252,241,0.3)' }}>{g.hasLeaderToken ? '✅ API-Key hinterlegt' : '❌ Kein API-Key'}</td>
                    <td style={{textAlign:"right", fontFamily: "monospace", fontSize: "1.1rem", borderBottom: '2px solid rgba(102,252,241,0.3)', borderTop: '2px solid rgba(102,252,241,0.3)'}}>{g.totalActive}</td>
                    <td style={{textAlign:"right", fontFamily: "monospace", fontSize: "1.1rem", borderBottom: '2px solid rgba(102,252,241,0.3)', borderTop: '2px solid rgba(102,252,241,0.3)'}}>{g.wvwActive}</td>
                    <td style={{textAlign:"right", width: "200px", borderBottom: '2px solid rgba(102,252,241,0.3)', borderTop: '2px solid rgba(102,252,241,0.3)'}}>
                      <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.1)', width: '100px', height: '10px', borderRadius: '5px', overflow: 'hidden', verticalAlign: 'middle', marginRight: '10px' }}>
                        <div style={{ backgroundColor: 'var(--accent-color)', width: `${wvwShare}%`, height: '100%' }}></div>
                      </div>
                      <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{wvwShare}%</span>
                    </td>
                  </tr>
                );
              })}
              
              {filteredGuilds.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>
                    Keine entsprechenden Gilden gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pie Chart (Right Side) */}
        {chartSegments.length > 0 && (
          <div className="glass-panel" style={{ flex: "0 0 350px", display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem", position: "relative", background: "rgba(15, 15, 15, 0.4)", border: "1px solid rgba(102, 252, 241, 0.1)" }}>
             <h3 style={{ margin: "0 0 1.5rem 0", color: "var(--accent-color)" }}>WvW-Verteilung</h3>
             <svg
              viewBox="-1.3 -1.3 2.6 2.6"
              style={{ width: "100%", maxWidth: "300px", overflow: "visible" }}
             >
              <defs>
                <radialGradient id="overlapCenterGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="0" cy="0" r="1.1" fill="url(#overlapCenterGlow)" />

              {chartSegments.map((s) => {
                const slicePercent = s.wvwTotal / totalWvwSum;
                const start = getCoord(cumulativePercent);
                cumulativePercent += slicePercent;
                const end = getCoord(cumulativePercent);
                const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

                const isHovered = hoveredId === s.id;
                const isLinkedOverlap = !!(hoveredChartStats && !hoveredChartStats.isAndere && hoveredChartStats.overlapDetails[s.id as string]);

                let opacity = hoveredId ? 0.15 : 0.75;
                let outerR = 1.0;
                const innerR = 0.55;

                if (isHovered) { opacity = 1; outerR = 1.12; }
                else if (isLinkedOverlap) { opacity = 0.85; outerR = 1.06; }

                const d = [
                  `M ${start[0] * outerR} ${start[1] * outerR}`,
                  `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${end[0] * outerR} ${end[1] * outerR}`,
                  `L ${end[0] * innerR} ${end[1] * innerR}`,
                  `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${start[0] * innerR} ${start[1] * innerR}`,
                  `Z`
                ].join(" ");

                return (
                  <path
                    key={s.id}
                    d={d}
                    fill={s.color}
                    onMouseMove={(e) => handleMouseMove(e, s)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      transition: "opacity 0.25s ease, d 0.3s ease",
                      cursor: "pointer",
                      opacity,
                      stroke: isHovered ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.3)",
                      strokeWidth: "0.015"
                    }}
                  />
                );
              })}

              {/* Center text */}
              <text x="0" y="-0.05" textAnchor="middle" fill="var(--accent-color)" fontSize="0.22" fontWeight="bold">
                {hoveredChartStats ? hoveredChartStats.tag : "WvW"}
              </text>
              <text x="0" y="0.18" textAnchor="middle" fill="white" fontSize="0.32" fontWeight="bold">
                {hoveredChartStats ? hoveredChartStats.wvwTotal : totalWvwMembers}
              </text>
            </svg>

            {/* Floating tooltip */}
            {tooltip.visible && tooltip.stats && !tooltip.stats.isAndere && (
              <div style={{
                position: "absolute",
                left: tooltip.x + 12,
                top: tooltip.y - 10,
                background: "rgba(10,10,10,0.92)",
                border: `1px solid ${tooltip.stats.color}55`,
                borderLeft: `3px solid ${tooltip.stats.color}`,
                borderRadius: "8px",
                padding: "0.7rem 1rem",
                pointerEvents: "none",
                zIndex: 100,
                minWidth: "180px",
                backdropFilter: "blur(8px)",
                boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 15px ${tooltip.stats.color}22`
              }}>
                <div style={{ fontWeight: "bold", color: tooltip.stats.color, marginBottom: "0.4rem" }}>
                  {tooltip.stats.name}
                </div>
                <div style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.3rem" }}>
                  <span style={{ color: "#66FCF1" }}>{tooltip.stats.wvwTotal}</span> WvW-Mitglieder
                </div>
                <div style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.3rem" }}>
                  <span style={{ color: "#2ecc71" }}>{tooltip.stats.wvwExclusive}</span> nur in dieser Gilde
                </div>
                {tooltip.stats.wvwOverlap > 0 && (
                  <>
                    <div style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.3rem" }}>
                      <span style={{ color: "#e67e22" }}>{tooltip.stats.wvwOverlap}</span> auch in anderen Gilden:
                    </div>
                    <div style={{ paddingLeft: "0.5rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      {Object.entries(tooltip.stats.overlapDetails as Record<string, any>).map(([gid, count]: [string, any]) => {
                        const g = allGuilds.find((x: any) => x.id === gid);
                        return (
                          <div key={gid} style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                            → {String(g?.tag || gid)}: <strong style={{ color: "#e67e22" }}>{String(count)}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {tooltip.stats.wvwOverlap === 0 && (
                  <div style={{ fontSize: "0.75rem", opacity: 0.5, fontStyle: "italic" }}>Keine Überschneidungen</div>
                )}
              </div>
            )}

            {/* Tooltip for "Andere" */}
            {tooltip.visible && tooltip.stats?.isAndere && (
              <div style={{
                position: "absolute",
                left: tooltip.x + 12,
                top: tooltip.y - 10,
                background: "rgba(10,10,10,0.92)",
                border: "1px solid #555e6e55",
                borderLeft: "3px solid #555e6e",
                borderRadius: "8px",
                padding: "0.7rem 1rem",
                pointerEvents: "none",
                zIndex: 100,
                minWidth: "180px",
                backdropFilter: "blur(8px)"
              }}>
                <div style={{ fontWeight: "bold", color: "#aaa", marginBottom: "0.4rem" }}>Andere</div>
                <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>
                  <span style={{ color: "#66FCF1" }}>{tooltip.stats.wvwTotal}</span> WvW ohne Sub-Gilde
                </div>
                <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>
                  <span style={{ color: "#aaa" }}>{tooltip.stats.totalMembers}</span> Gesamt ohne Sub-Gilde
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
