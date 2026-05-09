"use client";
import React, { useMemo, useState } from "react";

interface GuildStats {
  id: string;
  name: string;
  tag: string;
  wvwTotal: number;        // Segment size: WvW members
  totalMembers: number;    // For display only
  wvwExclusive: number;
  wvwOverlap: number;
  overlapDetails: Record<string, number>; // guildId -> number of WvW members shared
  color: string;
  isAndere: boolean;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  stats: GuildStats | null;
}

export default function OverlapChart({ members, guilds }: { members: any[], guilds: any[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, stats: null });

  const { stats, andereStats } = useMemo(() => {
    const subGuilds = guilds.filter(g => !g.isAllianceGuild);
    const colors = [
      "#66FCF1", "#e67e22", "#9b59b6", "#2ecc71", "#e74c3c",
      "#3498db", "#f1c40f", "#1abc9c", "#e91e63", "#ff9800"
    ];

    const subGuildIds = new Set(subGuilds.map(g => g.id));

    // --- Sub-guild stats ---
    const result: GuildStats[] = subGuilds.map((g, i) => {
      const wvwInGuild = members.filter(m =>
        m.status === "ACTIVE" &&
        m.wvwMember &&
        (m.guilds || []).some((mg: any) => mg.id === g.id)
      );
      const allInGuild = members.filter(m =>
        m.status === "ACTIVE" &&
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
        totalMembers: allInGuild.length,
        wvwExclusive,
        wvwOverlap,
        overlapDetails,
        color: colors[i % colors.length],
        isAndere: false
      };
    }).filter(s => s.wvwTotal > 0);

    // --- "Andere" stats ---
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

    const andereStats: GuildStats | null = andereWvw.length > 0 ? {
      id: "andere",
      name: "Andere",
      tag: "???",
      wvwTotal: andereWvw.length,
      totalMembers: andereAll.length,
      wvwExclusive: andereWvw.length,
      wvwOverlap: 0,
      overlapDetails: {},
      color: "#555e6e",
      isAndere: true
    } : null;

    return {
      stats: result.sort((a, b) => b.wvwTotal - a.wvwTotal),
      andereStats
    };
  }, [members, guilds]);

  const allSegments = andereStats ? [...stats, andereStats] : stats;
  const totalWvw = allSegments.reduce((sum, s) => sum + s.wvwTotal, 0);
  const hoveredStats = allSegments.find(s => s.id === hoveredId) || null;

  // SVG Donut Math — rotated so it starts at top
  let cumulativePercent = -0.25; // -90deg offset
  function getCoord(percent: number) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  const totalWvwMembers = members.filter(m => m.status === "ACTIVE" && m.wvwMember).length;

  if (allSegments.length === 0) return null;

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, s: GuildStats) => {
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
    <div className="glass-panel" style={{
      padding: "2.5rem",
      marginTop: "3rem",
      display: "flex",
      gap: "4rem",
      alignItems: "center",
      flexWrap: "wrap",
      background: "rgba(15, 15, 15, 0.4)",
      border: "1px solid rgba(102, 252, 241, 0.1)",
      boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
    }}>
      {/* Legend */}
      <div style={{ flex: "1 1 300px" }}>
        <h2 style={{ marginBottom: "0.5rem", color: "var(--accent-color)", fontSize: "1.5rem" }}>WvW-Verteilung</h2>
        <p style={{ opacity: 0.6, fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Diagrammgröße basiert auf WvW-Mitgliedern. Hover zeigt Überschneidungen.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          {allSegments.map((s) => {
            const isRelevant = !hoveredId || hoveredId === s.id || hoveredStats?.overlapDetails[s.id];
            return (
              <div
                key={s.id}
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "8px",
                  background: hoveredId === s.id ? "rgba(102, 252, 241, 0.08)" : "transparent",
                  transition: "all 0.2s ease",
                  opacity: isRelevant ? 1 : 0.25,
                  transform: hoveredId === s.id ? "translateX(6px)" : "none"
                }}
              >
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: s.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name} <span style={{ opacity: 0.5, fontSize: "0.75rem" }}>[{s.tag}]</span>
                  </div>
                  <div style={{ fontSize: "0.7rem", opacity: 0.45 }}>
                    {s.wvwTotal} WvW · {s.totalMembers} Gesamt
                  </div>
                </div>
                <div style={{ fontWeight: "bold", color: s.color, fontSize: "0.85rem", flexShrink: 0 }}>
                  {Math.round((s.wvwTotal / totalWvwMembers) * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: "1 1 300px", display: "flex", justifyContent: "center", position: "relative" }}>
        <svg
          viewBox="-1.3 -1.3 2.6 2.6"
          style={{ width: "100%", maxWidth: "380px", overflow: "visible" }}
        >
          <defs>
            <radialGradient id="overlapCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="1.1" fill="url(#overlapCenterGlow)" />

          {allSegments.map((s) => {
            const slicePercent = s.wvwTotal / totalWvw;
            const start = getCoord(cumulativePercent);
            cumulativePercent += slicePercent;
            const end = getCoord(cumulativePercent);
            const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

            const isHovered = hoveredId === s.id;
            const isLinkedOverlap = !!(hoveredStats && !hoveredStats.isAndere && hoveredStats.overlapDetails[s.id]);

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
            {hoveredStats ? hoveredStats.tag : "WvW"}
          </text>
          <text x="0" y="0.18" textAnchor="middle" fill="white" fontSize="0.32" fontWeight="bold">
            {hoveredStats ? hoveredStats.wvwTotal : totalWvwMembers}
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
                  {Object.entries(tooltip.stats.overlapDetails).map(([gid, count]) => {
                    const g = guilds.find((x: any) => x.id === gid);
                    return (
                      <div key={gid} style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                        → {g?.tag || gid}: <strong style={{ color: "#e67e22" }}>{count}</strong>
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
    </div>
  );
}
