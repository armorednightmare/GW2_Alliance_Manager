import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateMemberComment, addMemberToManualGuild, removeMemberFromManualGuild } from "./actions";
import { getUserDiscordRoles } from "@/lib/discord";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { canEditMember, AuthUser } from "@/lib/permissions";


export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const member = await prisma.member.findUnique({
    where: { id: params.id },
    include: {
      guilds: {
        include: { guild: true }
      },
      linkedUser: true,
      history: {
        orderBy: { createdAt: 'desc' },
        take: 20
      }
    }
  });

  if (!member) return notFound();

  const session = await getServerSession(authOptions);
  const user = (session as any)?.user as AuthUser | undefined;

  const memberGuildIds = member.guilds.map(g => g.guildId);

  // --- Visibility Check ---
  // If not alliance member, only Admin or their Guild Leader can see the profile
  if (!member.isAllianceMember) {
    if (user?.role === "ADMIN" || user?.role === "ALLIANCE_LEADER") {
      // Allowed
    } else if (user?.role === "GUILD_LEADER" && canEditMember(user, memberGuildIds)) {
      // Allowed
    } else {
      // Restricted
      return notFound();
    }
  }

  const manualRoles = await prisma.manualRole.findMany({ orderBy: { name: 'asc' } });
  const manualGuilds = await prisma.guild.findMany({ where: { isManual: true }, orderBy: { name: 'asc' } });

  let discordRoles: any[] = [];
  if (member.linkedUser?.discordId) {
    discordRoles = await getUserDiscordRoles(member.linkedUser.discordId);
  }

  return (
    <div>
      <h1>Profil: {member.accountName}</h1>

      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Allgemeine Details</h3>
          <p><strong>Status:</strong> {member.status}</p>
          <p><strong>WvW Vertreten:</strong> {member.wvwMember ? 'Ja' : 'Nein'}</p>
          <p><strong>Allianz Mitglied:</strong> {member.isAllianceMember ? 'Ja' : 'Nein'}</p>
          {member.invitedBy && <p><strong>Eingeladen von:</strong> {member.invitedBy}</p>}

          <h3 style={{ marginTop: '1.5rem' }}>Gilden & Ränge</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {member.guilds.map((mg) => (
              <div key={mg.id} style={{ 
                background: 'rgba(255,255,255,0.05)', 
                padding: '0.8rem', 
                borderRadius: '4px',
                borderLeft: mg.guild.isAllianceGuild ? '3px solid var(--accent-color)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{mg.guild.name} [{mg.guild.tag}] {mg.guild.isManual && '(Manuell)'}</strong>
                  {mg.guild.isManual && canEditMember(user, memberGuildIds) && (
                    <form action={removeMemberFromManualGuild}>
                      <input type="hidden" name="memberGuildId" value={mg.id} />
                      <button type="submit" style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.2rem'}} title="Entfernen">
                        🗑
                      </button>
                    </form>
                  )}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Rang: {mg.rank}</div>
              </div>
            ))}
            {member.guilds.length === 0 && <p style={{ opacity: 0.6 }}>Keinen Gilden zugeordnet.</p>}
          </div>

          <hr style={{ margin: '1.5rem 0', borderColor: 'rgba(255,255,255,0.1)' }} />

          <h3>Discord Profil</h3>
          {member.linkedUser ? (
            member.linkedUser.discordId ? (
              <div>
                <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Verknüpft: ✅</p>
                {discordRoles.length > 0 ? (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                    {discordRoles.map((r: any) => (
                      <span key={r.id} style={{
                        background: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : "var(--primary-color)",
                        color: "white", padding: "0.2rem 0.5rem", borderRadius: "12px", fontSize: "0.8rem",
                        textShadow: "0px 0px 3px rgba(0,0,0,0.8)"
                      }}>
                        {r.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>(Keine spezifischen Rollen gefunden oder Bot nicht konfiguriert)</p>
                )}
              </div>
            ) : (
              <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Account registriert, aber nicht via Discord eingeloggt.</p>
            )
          ) : (
            <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Noch kein Web-Account verknüpft.</p>
          )}

          {canEditMember(user, memberGuildIds) && (
            <>
              <h3>Verwaltung</h3>
              <form action={updateMemberComment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="hidden" name="memberId" value={member.id} />

                <label>Manuelle Rolle</label>
                <select name="manualRole" defaultValue={member.manualRole || ""} style={{ padding: '0.5rem', background: '#1e1e1e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                  <option value="" style={{ background: '#1e1e1e', color: 'white' }}>-- Keine --</option>
                  {manualRoles.map((r: any) => (
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
                  {manualGuilds.map((g: any) => {
                    const isAlreadyMember = member.guilds.some((mg: any) => mg.guildId === g.id);
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

        <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Aktivitäten / Historie</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {member.history
              .filter((item: any) => {
                const isCommentEvent = item.eventType === "COMMENT_ADDED" || item.eventType === "COMMENT_CHANGED";
                if (isCommentEvent) {
                  // Only show comment history to people who can actually edit/see comments
                  return canEditMember(user, memberGuildIds);
                }
                return true;
              })
              .map((item: any) => (
                <li key={item.id} style={{ marginBottom: '1rem', borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }} suppressHydrationWarning>{item.createdAt.toLocaleString('de-DE')}</div>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--accent-color)' }}>{item.eventType.replace(/_/g, ' ')}</strong>
                  {item.oldValue || item.newValue ? (
                    <div style={{ marginTop: '0.2rem', fontSize: '0.9rem' }}>
                      {item.oldValue && <span style={{ opacity: 0.6 }}>{item.oldValue} ➔ </span>}
                      <span>{item.newValue}</span>
                    </div>
                  ) : null}
                </li>
              ))}
            {member.history.length === 0 && <p>Keine Historien-Einträge vorhanden.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
