"use client";
import React, { useMemo } from "react";

type OverlapData = {
  label: string;
  value: number;
  color: string;
};

export default function OverlapChart({ members, guilds }: { members: any[], guilds: any[] }) {
  const data = useMemo(() => {
    // Determine the unique combinations of guilds
    const comboMap = new Map<string, number>();

    members.forEach(m => {
      if (!m.isAllianceMember || m.status !== "ACTIVE") return;
      
      const userGuildIds = (m.guilds || []).map((mg: any) => mg.id);
      const userGuilds = guilds.filter(g => userGuildIds.includes(g.id) && !g.isAllianceGuild);
      
      let key = "Andere / Keine Sub-Gilde";
      if (userGuilds.length > 0) {
        key = userGuilds.map(g => g.tag).sort().join(" + ");
      }
      
      comboMap.set(key, (comboMap.get(key) || 0) + 1);
    });

    const colors = [
      "#ff5a5f", "#3b5998", "#00aced", "#4db6ac", "#fbc02d", 
      "#8e44ad", "#e67e22", "#2ecc71", "#e74c3c", "#34495e"
    ];

    let colorIdx = 0;
    const result: OverlapData[] = [];
    comboMap.forEach((val, key) => {
      result.push({
        label: key,
        value: val,
        color: key === "Andere / Keine Sub-Gilde" ? "#555" : colors[colorIdx++ % colors.length]
      });
    });

    return result.sort((a, b) => b.value - a.value); // Largest slices first
  }, [members, guilds]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  // SVG Pie Chart Math
  let cumulativePercent = 0;
  
  function getCoordinatesForPercent(percent: number) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  if (total === 0) return <div>Keine Daten für das Diagramm.</div>;

  return (
    <div className="glass-panel" style={{ padding: "2rem", marginTop: "2rem", display: "flex", gap: "3rem", alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 300px", maxWidth: "400px" }}>
        <h3 style={{ marginBottom: "1rem", color: "var(--accent-color)" }}>Überschneidungen (Allianz)</h3>
        <p style={{ opacity: 0.8, fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Dieses Diagramm zeigt, wie sich die Allianzmitglieder auf die verschiedenen Sub-Gilden aufteilen und wo es Überschneidungen gibt.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {data.map((d, i) => (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: d.color }}></div>
              <span style={{ fontWeight: "bold" }}>{d.label}</span>
              <span style={{ marginLeft: "auto", opacity: 0.7, fontFamily: "monospace", fontSize: "1.1rem" }}>
                {d.value} <span style={{ fontSize: "0.8rem" }}>({Math.round((d.value / total) * 100)}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ flex: "1 1 300px", display: "flex", justifyContent: "center" }}>
        <svg viewBox="-1 -1 2 2" style={{ transform: "rotate(-90deg)", width: "100%", maxWidth: "300px", overflow: "visible" }}>
          {data.map((slice, i) => {
            const slicePercent = slice.value / total;
            const start = getCoordinatesForPercent(cumulativePercent);
            cumulativePercent += slicePercent;
            const end = getCoordinatesForPercent(cumulativePercent);
            const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
            
            // If it's a full circle (100%)
            if (slicePercent === 1) {
              return (
                <circle key={i} cx="0" cy="0" r="1" fill={slice.color} />
              );
            }

            const pathData = [
              `M ${start[0]} ${start[1]}`, // Move
              `A 1 1 0 ${largeArcFlag} 1 ${end[0]} ${end[1]}`, // Arc
              `L 0 0`, // Line to center
            ].join(" ");

            return (
              <path 
                key={i} 
                d={pathData} 
                fill={slice.color} 
                stroke="#121212" 
                strokeWidth="0.02"
                style={{ transition: "all 0.3s ease" }}
              />
            );
          })}
          {/* Inner circle for Donut effect */}
          <circle cx="0" cy="0" r="0.5" fill="#1e1e1e" />
        </svg>
      </div>
    </div>
  );
}
