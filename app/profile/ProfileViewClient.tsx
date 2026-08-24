"use client";
import React from "react";
import { useLanguage } from "../components/LanguageContext";
import DateDisplay from "../components/DateDisplay";
import ProfileClient from "./ProfileClient";

export default function ProfileViewClient({ sanitizedUser, sanitizedMember }: { sanitizedUser: any, sanitizedMember: any }) {
  const { t } = useLanguage();

  return (
    <div className="profile-page-wrapper">
      <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)" }}>{t("myProfile")}</h1>

      {sanitizedUser.role === "NEW_USER" && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(102,252,241,0.15), rgba(102,252,241,0.05))',
          border: '2px solid rgba(102,252,241,0.4)',
          borderRadius: '12px',
          padding: '1.5rem 2rem',
          marginBottom: '2rem',
          animation: 'fadeIn 0.5s ease-in'
        }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-color)', fontSize: '1.2rem' }}>
            {t("welcomeAlliance")}
          </h2>
          <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
            {t("welcomeNewUserDesc")}
          </p>
        </div>
      )}

      <p style={{ opacity: 0.8, marginBottom: '2rem' }}>
        {t("welcomeBack")}, <strong>{sanitizedUser.name || sanitizedUser.email}</strong>. {t("linkedData")}
      </p>

      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem', maxWidth: '400px' }}>
        <label style={{ fontSize: '0.8rem', opacity: 0.6, display: 'block', marginBottom: '0.4rem' }}>{t("linkedWebAccount")}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {sanitizedUser.discordId ? (
            <span style={{ color: '#5865F2', fontWeight: 'bold' }}>🎮 Discord</span>
          ) : !sanitizedUser.passwordHash ? (
            <span style={{ color: '#DB4437', fontWeight: 'bold' }}>📧 Google</span>
          ) : (
            <span style={{ fontWeight: 'bold' }}>👤 {t("manualAccount")} {sanitizedUser.email && <span style={{ opacity: 0.7, fontWeight: 'normal' }}>({sanitizedUser.email})</span>}</span>
          )}
        </div>
      </div>

      {sanitizedMember ? (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Member Details Card */}
          <div style={{ flex: '1 1 400px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>{t("gw2CharData")}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>

              <div>
                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>{t("accountNameTitle")}</label>
                <div style={{ fontWeight: 'bold' }}>{sanitizedMember.accountName}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>{t("statusTitle")}</label>
                <div>
                  <span className={`status-badge status-${sanitizedMember.status.toLowerCase()}`}>
                    {sanitizedMember.status}
                  </span>
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>{t("combatGuildActive")}</label>
                <div>{sanitizedMember.wvwMember ? `✅ ${t("yes")}` : `❌ ${t("no")}`}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>{t("allianceMemberAsk")}</label>
                <div>{sanitizedMember.isAllianceMember ? `✅ ${t("yes")}` : `❌ ${t("no")}`}</div>
              </div>
              {sanitizedMember.invitedBy && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>{t("invitedBy")}</label>
                  <div>{sanitizedMember.invitedBy}</div>
                </div>
              )}
            </div>

            <h3 style={{ marginTop: '1.5rem', fontSize: '1rem', opacity: 0.9 }}>{t("guildsAndRanks")}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {sanitizedMember.guilds.map((mg: any) => (
                <div key={mg.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px' }}>
                  <strong style={{ color: mg.isAllianceGuild ? 'var(--accent-color)' : 'inherit' }}>
                    {mg.name} [{mg.tag}]
                  </strong>
                  <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{t("rank")}: {mg.rank}</div>
                </div>
              ))}
              {sanitizedMember.guilds.length === 0 && <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>{t("noGuildsAssigned")}</p>}
            </div>
            
            {sanitizedMember.manualRole && (
              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>{t("assignedRole")}</label>
                <div style={{ marginTop: '0.3rem' }}><span className="badge">{sanitizedMember.manualRole}</span></div>
              </div>
            )}
            
            {/* Note: Administrative comments (member.comment) are strictly hidden for privacy as requested */}
          </div>

          {/* Activity History Card */}
          <div style={{ flex: '1 1 300px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>{t("recentActivities")}</h3>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
              {sanitizedMember.history
                .filter((item: any) => !["COMMENT_ADDED", "COMMENT_CHANGED"].includes(item.eventType || item.type))
                .map((item: any) => (
                  <li key={item.id} style={{ marginBottom: '1rem', borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem', fontSize: '0.9rem' }}>
                    <DateDisplay 
                      date={item.timestamp || item.createdAt} 
                      style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block' }} 
                    />
                    <strong>{(item.eventType || item.type || "").replace(/_/g, ' ')}</strong>
                    {item.description && (
                      <div style={{ opacity: 0.9, fontSize: '0.85rem', marginTop: '0.1rem' }}>
                        {item.description}
                      </div>
                    )}
                    {(!item.description || (item.eventType !== "JOINED" && item.eventType !== "LEFT" && item.eventType !== "KICKED" && item.eventType !== "INVITED")) && item.newValue && (
                      <div style={{ opacity: 0.8, fontSize: '0.85rem' }}>➔ {item.newValue}</div>
                    )}
                  </li>
              ))}
              {sanitizedMember.history.length === 0 && <p style={{ opacity: 0.5 }}>{t("noActivitiesRecorded")}</p>}
            </ul>
          </div>
        </div>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          <p>{t("noGw2AccountLinked")}</p>
        </div>
      )}

      {/* Account Settings / Link Management */}
      <ProfileClient isLinked={!!sanitizedMember} userRole={sanitizedUser.role} />
    </div>
  );
}
