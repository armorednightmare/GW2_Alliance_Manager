"use client";

import Link from "next/link";
import { useLanguage } from "./components/LanguageContext";
import DateDisplay from "./components/DateDisplay";
import "./Dashboard.css";

interface DashboardClientProps {
  allianceName: string;
  totalMembers: number;
  totalSubGuilds: number;
  dangerMembers: any[];
  recentHistory: any[];
  allianceGuildIds: string[];
}

export default function DashboardClient({
  allianceName,
  totalMembers,
  totalSubGuilds,
  dangerMembers,
  recentHistory,
  allianceGuildIds
}: DashboardClientProps) {
  const { t } = useLanguage();

  return (
    <div className="dashboard-container">
      <h1>{allianceName} {t("dashboardTitle")}</h1>

      <div className="stats-row">
        <Link href="/members" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <h3>{t("membersCount")}</h3>
          <p className="stat-value">{totalMembers}</p>
        </Link>
        <Link href="/guilds" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <h3>{t("guildsCount")}</h3>
          <p className="stat-value">{totalSubGuilds}</p>
        </Link>
      </div>

      <div className="dashboard-grid">
        <div className="panels-column">
          <div className={`alert-panel ${dangerMembers.length === 0 ? 'success' : ''}`}>
            <h2>
              {dangerMembers.length === 0 ? '✅' : '⚠️'} {t("wvwAlarm")} ({dangerMembers.length})
            </h2>
            <p style={{ opacity: 0.8, marginBottom: '1rem' }}>
              {t("wvwAlarmDesc")}
            </p>

            {dangerMembers.length === 0 ? (
              <div className="success-msg">{t("allWvwOk")}</div>
            ) : (
              <ul className="danger-list">
                {dangerMembers.map((m: any) => {
                  const allianceGuild = (m.guilds || []).find((mg: any) => mg.isAllianceGuild || allianceGuildIds.includes(mg.id));
                  const allianceRank = allianceGuild ? allianceGuild.rank : null;
                  return (
                    <li key={m.id}>
                      <div>
                        <strong>{m.accountName}</strong>
                        {allianceRank && (
                          <span style={{ 
                            marginLeft: '8px', 
                            fontSize: '0.8rem', 
                            padding: '1px 6px', 
                            borderRadius: '4px', 
                            background: 'rgba(255,255,255,0.1)', 
                            color: '#66FCF1',
                            border: '1px solid rgba(102, 252, 241, 0.2)'
                          }}>
                            {allianceRank}
                          </span>
                        )}
                        <div className="guild-tag" style={{ marginTop: '2px', fontSize: '0.8rem' }}>
                          {(m.guilds || []).map((mg: any) => `[${mg.tag}]`).join(' ')}
                        </div>
                      </div>
                      <Link href={`/members/${m.id}`} className="btn-small">{t("profile")}</Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="history-panel">
          <h2>{t("recentActivity")}</h2>
          <ul className="history-list">
            {recentHistory.map((h: any) => {
              const memberName = h.member?.accountName || t("unknown");
              const eventTypeTranslated = (h.eventType || h.type || "").replace(/_/g, ' ');
              return (
                <li key={h.id} style={{ padding: 0 }}>
                  <Link
                    href={`/history#hist-${h.id}`}
                    style={{ display: "flex", alignItems: "center", width: "100%", padding: "0.8rem", color: "inherit", textDecoration: "none" }}
                  >
                    <DateDisplay 
                      date={h.createdAt} 
                      className="time" 
                      style={{ marginRight: '1rem', opacity: 0.7 }} 
                    />
                    <span className="event">{memberName} ➔ {eventTypeTranslated}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
