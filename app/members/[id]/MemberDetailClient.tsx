"use client";
import React from "react";
import { useLanguage } from "../../components/LanguageContext";
import DateDisplay from "../../components/DateDisplay";
import Link from "next/link";
import { updateMemberComment, addMemberToManualGuild, removeMemberFromManualGuild, updateDiscordName } from "./actions";

export default function MemberDetailClient({
  sanitizedMember,
  sanitizedGuilds,
  sanitizedHistory,
  sanitizedRoles,
  sanitizedManualRoles,
  sanitizedManualGuilds,
  effectiveDiscordName,
  isMe,
  hasEditPerms,
  canEditComments
}: any) {
  const { t } = useLanguage();

  return (
    <div>
      <h1>{t("profileOf")} {sanitizedMember.accountName}</h1>

      <div className="member-profile-grid">
        <div className="member-profile-main">
          <h3>{t("generalDetails")}</h3>
          <p><strong>{t("statusTitle")}:</strong> {sanitizedMember.status}</p>
          <p><strong>{t("wvwStatus")}:</strong> {sanitizedMember.wvwMember ? t("yes") : t("no")}</p>
          <p><strong>{t("allianceMemberAsk")}:</strong> {sanitizedMember.isAllianceMember ? t("yes") : t("no")}</p>
          {sanitizedMember.invitedBy && <p><strong>{t("invitedBy")}:</strong> {sanitizedMember.invitedBy}</p>}

          <h3 style={{ marginTop: '1.5rem' }}>{t("guildsAndRanks")}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {sanitizedGuilds.map((mg: any) => (
              <div key={mg.id} style={{ 
                background: 'rgba(255,255,255,0.05)', 
                padding: '0.8rem', 
                borderRadius: '4px',
                borderLeft: mg.isAllianceGuild ? '3px solid var(--accent-color)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{mg.name} [{mg.tag}] {mg.isManual && t("manualSuffix")}</strong>
                  {mg.isManual && hasEditPerms && (
                    <form action={removeMemberFromManualGuild}>
                      <input type="hidden" name="memberGuildId" value={mg.id} />
                      <button type="submit" style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.2rem'}} title={t("remove")}>
                        🗑
                      </button>
                    </form>
                  )}
                </div>
                {mg.rank && <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>{t("rank")}: {mg.rank}</div>}
              </div>
            ))}
            {sanitizedMember.guilds.length === 0 && <p style={{ opacity: 0.6 }}>{t("noGuildsAssigned")}</p>}
          </div>

          <hr style={{ margin: '1.5rem 0', borderColor: 'rgba(255,255,255,0.1)' }} />

          <div style={{ marginBottom: "2rem" }}>
            <h3>{t("discordProfile")}</h3>
            
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #5865F2' }}>
              {effectiveDiscordName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{effectiveDiscordName}</span>
                  {sanitizedMember.customDiscordName ? (
                    <span style={{fontSize:'0.8rem', opacity:0.6}}>{t("manuallyOverridden")}</span>
                  ) : (
                    <span style={{fontSize:'0.8rem', color:'#5865F2'}}>{t("linkedVerified")}</span>
                  )}
                </div>
              ) : (
                <p style={{ opacity: 0.6, fontSize: '0.9rem', margin: 0 }}>{t("noDiscordData")}</p>
              )}

              {sanitizedMember.linkedUser?.discordId && sanitizedRoles.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
                  {sanitizedRoles.map((r: any) => (
                    <span key={r.id} style={{
                      background: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : "var(--primary-color)",
                      color: "white", padding: "0.2rem 0.6rem", borderRadius: "12px", fontSize: "0.75rem",
                      textShadow: "0px 0px 3px rgba(0,0,0,0.8)", fontWeight: 'bold'
                    }}>
                      {r.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {(isMe || hasEditPerms) && (
              <form action={updateDiscordName} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>{t("adjustDiscordName")}</label>
                <input type="hidden" name="memberId" value={sanitizedMember.id} />
                <div className="discord-name-row">
                  <input type="text" name="customDiscordName" defaultValue={sanitizedMember.customDiscordName || sanitizedMember.linkedUser?.name || ""} placeholder={t("newDiscordName")} style={{ flex: 1, padding: '0.5rem', background: '#1e1e1e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} />
                  <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{t("save")}</button>
                </div>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: 0 }}>{t("discordEmptyHint")}</p>
              </form>
            )}
          </div>
          {hasEditPerms && (
            <>
              <h3>{t("management")}</h3>
              <form action={updateMemberComment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="hidden" name="memberId" value={sanitizedMember.id} />

                <label>{t("manualRole")}</label>
                <select name="manualRole" defaultValue={sanitizedMember.manualRole || ""} style={{ padding: '0.5rem', background: '#1e1e1e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                  <option value="" style={{ background: '#1e1e1e', color: 'white' }}>{t("none")}</option>
                  {sanitizedManualRoles.map((r: any) => (
                    <option key={r.id} value={r.name} style={{ background: '#1e1e1e', color: 'white' }}>{r.name}</option>
                  ))}
                </select>

                <label>{t("commentNote")}</label>
                <textarea name="comment" defaultValue={sanitizedMember.comment || ""} rows={4} style={{ padding: '0.5rem', background: '#1e1e1e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}></textarea>

                <button type="submit" style={{ padding: '0.8rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {t("save")}
                </button>
              </form>

              <hr style={{ margin: '1.5rem 0', borderColor: 'rgba(255,255,255,0.1)' }} />

              <form action={addMemberToManualGuild} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ margin: 0 }}>{t("assignManualGuild")}</h4>
                <input type="hidden" name="memberId" value={sanitizedMember.id} />

                <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>{t("guildOption")}</label>
                <select name="guildId" required style={{ padding: '0.5rem', background: '#1e1e1e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                  <option value="" style={{ background: '#1e1e1e', color: 'white' }}>{t("pleaseSelect")}</option>
                  {sanitizedManualGuilds.map((g: any) => {
                    const isAlreadyMember = (sanitizedMember.guilds || []).some((mg: any) => mg.id === g.id);
                    if (isAlreadyMember) return null;
                    return (
                      <option key={g.id} value={g.id} style={{ background: '#1e1e1e', color: 'white' }}>
                        {g.name} [{g.tag}]
                      </option>
                    );
                  })}
                </select>

                <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>{t("rankOptional")}</label>
                <input type="text" name="rank" placeholder={t("egGuest")} style={{ padding: '0.5rem', background: '#1e1e1e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} />

                <button type="submit" style={{ padding: '0.6rem', background: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {t("addBtn")}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="member-profile-history">
          <h3>{t("activitiesHistory")}</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {sanitizedHistory
              .filter((item: any) => {
                const isCommentEvent = item.eventType === "COMMENT_ADDED" || item.eventType === "COMMENT_CHANGED";
                if (isCommentEvent) {
                  return canEditComments;
                }
                return true;
              })
              .map((item: any) => (
                <li key={item.id} style={{ marginBottom: '1rem', borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem' }}>
                  <DateDisplay 
                    date={item.timestamp || item.createdAt} 
                    style={{ fontSize: '0.8rem', opacity: 0.7, display: 'block' }} 
                  />
                  <strong style={{ fontSize: '0.85rem', color: 'var(--accent-color)' }}>{(item.eventType || item.type || "UNKNOWN").replace(/_/g, ' ')}</strong>
                  {item.oldValue || item.newValue ? (
                    <div style={{ marginTop: '0.2rem', fontSize: '0.9rem' }}>
                      {item.oldValue && <span style={{ opacity: 0.6, textDecoration: 'line-through' }}>{item.oldValue}</span>}
                      {item.oldValue && <span style={{ opacity: 0.6 }}> ➔ </span>}
                      <span>{item.newValue || <em style={{opacity: 0.5}}>{t("cleared")}</em>}</span>
                    </div>
                  ) : null}
                </li>
              ))}
            {sanitizedHistory.length === 0 && <p>{t("noHistoryEntries")}</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
