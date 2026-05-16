import { db } from "@/lib/firebase-admin";
import "./MemberProfile.css";
import { notFound, redirect } from "next/navigation";
import { updateMemberComment, addMemberToManualGuild, removeMemberFromManualGuild, updateDiscordName } from "./actions";
import { getUserDiscordRoles } from "@/lib/discord";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { canEditMember, AuthUser, canSeeRank } from "@/lib/permissions";
import DateDisplay from "@/app/components/DateDisplay";
import { sanitizeData } from "@/lib/utils";


export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const memberDoc = await db.collection("members").doc(params.id).get();
  
  if (!memberDoc.exists) return notFound();
  
  const member = { id: memberDoc.id, ...memberDoc.data() } as any;

  // Linked User lookup
  const linkedUserSnapshot = await db.collection("users").where("memberId", "==", params.id).limit(1).get();
  const linkedUser = linkedUserSnapshot.empty ? null : { id: linkedUserSnapshot.docs[0].id, ...linkedUserSnapshot.docs[0].data() };
  member.linkedUser = linkedUser;

  // History fetch from sub-collection
  const historySnapshot = await memberDoc.ref.collection("history").orderBy("timestamp", "desc").limit(20).get();
  member.history = historySnapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data(),
    createdAt: doc.data().timestamp?.toDate() || new Date()
  }));

  if (!member) return notFound();

  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = (session as any)?.user as AuthUser | undefined;

  // Mask ranks for guilds the user is not part of
  const maskedGuilds = (member.guilds || []).map((mg: any) => ({
    ...mg,
    rank: canSeeRank(user, mg as any) ? mg.rank : ""
  }));

  const memberGuildIds = (member.guilds || []).map((g: any) => g.id);

  // Mask history RANK_CHANGE events
  const maskedHistory = (member.history || []).map((item: any) => {
    if (item.eventType === "RANK_CHANGE") {
      // RANK_CHANGE values are formatted as "Rank (TAG)"
      // We try to extract the TAG and check permissions
      const tagMatch = item.newValue?.match(/\(([^)]+)\)/) || item.oldValue?.match(/\(([^)]+)\)/);
      if (tagMatch) {
         const tag = tagMatch[1];
         const guild = (member.guilds || []).find((mg: any) => mg.tag === tag);
         if (guild && !canSeeRank(user, guild as any)) {
           return {
             ...item,
             oldValue: item.oldValue ? "" : null,
             newValue: item.newValue ? "" : null
           };
         }
      }
    }
    return item;
  });

  const sanitizedMember = sanitizeData(member);
  const sanitizedHistory = sanitizeData(maskedHistory);
  const sanitizedGuilds = sanitizeData(maskedGuilds);

  // --- Visibility Check ---
  // If not alliance member, only Admin or their Guild Leader can see the profile
  if (!member.isAllianceMember) {
    if (user?.role === "ADMIN" || user?.role === "ALLIANCE_LEADER") {
      // Allowed
    } else if (user?.role === "GUILD_LEADER" && canEditMember(user, memberGuildIds, member.isAllianceMember, member.leftAt, member.pastGuildIds, member.wasAllianceMember)) {
      // Allowed
    } else {
      // Restricted
      return notFound();
    }
  }

  const manualRolesSnapshot = await db.collection("roles").orderBy("name", "asc").get();
  const manualRoles = manualRolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const manualGuildsSnapshot = await db.collection("guilds").where("isManual", "==", true).get();
  const manualGuilds = manualGuildsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  let discordRoles: any[] = [];
  if (member.linkedUser?.discordId) {
    discordRoles = await getUserDiscordRoles(member.linkedUser.discordId);
  }

  const sanitizedRoles = sanitizeData(discordRoles);
  const sanitizedManualRoles = sanitizeData(manualRoles);
  const sanitizedManualGuilds = sanitizeData(manualGuilds);

  const isMe = user?.id && user.id === member.linkedUser?.id;
  const hasEditPerms = canEditMember(user, memberGuildIds, member.isAllianceMember, member.leftAt, member.pastGuildIds, member.wasAllianceMember);
  const effectiveDiscordName = member.customDiscordName || member.linkedUser?.name || null;

  return (
    <div>
      <h1>Profil: {sanitizedMember.accountName}</h1>

      <div className="member-profile-grid">
        <div className="member-profile-main">
          <h3>Allgemeine Details</h3>
          <p><strong>Status:</strong> {sanitizedMember.status}</p>
          <p><strong>WvW Vertreten:</strong> {sanitizedMember.wvwMember ? 'Ja' : 'Nein'}</p>
          <p><strong>Allianz Mitglied:</strong> {sanitizedMember.isAllianceMember ? 'Ja' : 'Nein'}</p>
          {sanitizedMember.invitedBy && <p><strong>Eingeladen von:</strong> {sanitizedMember.invitedBy}</p>}

          <h3 style={{ marginTop: '1.5rem' }}>Gilden & Ränge</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {sanitizedGuilds.map((mg: any) => (
              <div key={mg.id} style={{ 
                background: 'rgba(255,255,255,0.05)', 
                padding: '0.8rem', 
                borderRadius: '4px',
                borderLeft: mg.isAllianceGuild ? '3px solid var(--accent-color)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{mg.name} [{mg.tag}] {mg.isManual && '(Manuell)'}</strong>
                  {mg.isManual && hasEditPerms && (
                    <form action={removeMemberFromManualGuild}>
                      <input type="hidden" name="memberGuildId" value={mg.id} />
                      <button type="submit" style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.2rem'}} title="Entfernen">
                        🗑
                      </button>
                    </form>
                  )}
                </div>
                {mg.rank && <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Rang: {mg.rank}</div>}
              </div>
            ))}
            {sanitizedMember.guilds.length === 0 && <p style={{ opacity: 0.6 }}>Keinen Gilden zugeordnet.</p>}
          </div>

          <hr style={{ margin: '1.5rem 0', borderColor: 'rgba(255,255,255,0.1)' }} />

          <div style={{ marginBottom: "2rem" }}>
            <h3>Discord Profil</h3>
            
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #5865F2' }}>
              {effectiveDiscordName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{effectiveDiscordName}</span>
                  {sanitizedMember.customDiscordName ? (
                    <span style={{fontSize:'0.8rem', opacity:0.6}}>(Manuell überschrieben)</span>
                  ) : (
                    <span style={{fontSize:'0.8rem', color:'#5865F2'}}>(Verknüpft ✅)</span>
                  )}
                </div>
              ) : (
                <p style={{ opacity: 0.6, fontSize: '0.9rem', margin: 0 }}>Keine Discord-Daten vorhanden.</p>
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
                <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>Discord-Namen anpassen</label>
                <input type="hidden" name="memberId" value={sanitizedMember.id} />
                <div className="discord-name-row">
                  <input type="text" name="customDiscordName" defaultValue={sanitizedMember.customDiscordName || sanitizedMember.linkedUser?.name || ""} placeholder="Neuer Discord Name..." style={{ flex: 1, padding: '0.5rem', background: '#1e1e1e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} />
                  <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Speichern</button>
                </div>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: 0 }}>Leer lassen und speichern, um wieder den Namen der Web-Verknüpfung zu nutzen.</p>
              </form>
            )}
          </div>
          {canEditMember(user, memberGuildIds, member.isAllianceMember, member.leftAt, member.pastGuildIds, member.wasAllianceMember) && (
            <>
              <h3>Verwaltung</h3>
              <form action={updateMemberComment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="hidden" name="memberId" value={member.id} />

                <label>Manuelle Rolle</label>
                <select name="manualRole" defaultValue={sanitizedMember.manualRole || ""} style={{ padding: '0.5rem', background: '#1e1e1e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                  <option value="" style={{ background: '#1e1e1e', color: 'white' }}>-- Keine --</option>
                  {sanitizedManualRoles.map((r: any) => (
                    <option key={r.id} value={r.name} style={{ background: '#1e1e1e', color: 'white' }}>{r.name}</option>
                  ))}
                </select>

                <label>Kommentar / Notiz (z.B. Zweitaccount von X)</label>
                <textarea name="comment" defaultValue={member.comment || ""} rows={4} style={{ padding: '0.5rem', background: '#1e1e1e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}></textarea>

                <button type="submit" style={{ padding: '0.8rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Speichern
                </button>
              </form>

              <hr style={{ margin: '1.5rem 0', borderColor: 'rgba(255,255,255,0.1)' }} />

              <form action={addMemberToManualGuild} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ margin: 0 }}>Manuelle Gilde zuweisen</h4>
                <input type="hidden" name="memberId" value={member.id} />

                <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>Gilde</label>
                <select name="guildId" required style={{ padding: '0.5rem', background: '#1e1e1e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                  <option value="" style={{ background: '#1e1e1e', color: 'white' }}>-- Bitte wählen --</option>
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

                <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>Rang (optional)</label>
                <input type="text" name="rank" placeholder="z.B. Gast" style={{ padding: '0.5rem', background: '#1e1e1e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} />

                <button type="submit" style={{ padding: '0.6rem', background: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  + Hinzufügen
                </button>
              </form>
            </>
          )}
        </div>

        <div className="member-profile-history">
          <h3>Aktivitäten / Historie</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {sanitizedHistory
              .filter((item: any) => {
                const isCommentEvent = item.eventType === "COMMENT_ADDED" || item.eventType === "COMMENT_CHANGED";
                if (isCommentEvent) {
                  // Only show comment history to people who can actually edit/see comments
                  return canEditMember(user, memberGuildIds, member.isAllianceMember, member.leftAt, member.pastGuildIds, member.wasAllianceMember);
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
                      <span>{item.newValue || <em style={{opacity: 0.5}}>(geleert)</em>}</span>
                    </div>
                  ) : null}
                </li>
              ))}
            {sanitizedMember.history.length === 0 && <p>Keine Historien-Einträge vorhanden.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
