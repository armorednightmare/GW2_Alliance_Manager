export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ProfileClient from "./ProfileClient";
import DateDisplay from "../components/DateDisplay";
import "../members/Members.css";

interface UserSession {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
    id: string;
    subGuildIds?: string[];
  };
}

export default async function ProfilePage() {
  const session = (await getServerSession(authOptions)) as UserSession | null;


  if (!session?.user?.id) {
    return <div>Bitte einloggen.</div>;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      member: {
        include: {
          guilds: {
            include: { guild: true }
          },
          history: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      }
    }
  });

  if (!user) return <div>Nutzer nicht gefunden.</div>;

  const member = user.member;

  return (
    <div className="profile-page-wrapper">
      <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)" }}>Mein Profil</h1>
      <p style={{ opacity: 0.8, marginBottom: '2rem' }}>
        Willkommen zurück, <strong>{user.name || user.email}</strong>. Hier sehen Sie Ihre verknüpften Alliance-Daten.
      </p>

      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem', maxWidth: '400px' }}>
        <label style={{ fontSize: '0.8rem', opacity: 0.6, display: 'block', marginBottom: '0.4rem' }}>Verknüpfter Web-Account</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user.discordId ? (
            <span style={{ color: '#5865F2', fontWeight: 'bold' }}>🎮 Discord</span>
          ) : !user.passwordHash ? (
            <span style={{ color: '#DB4437', fontWeight: 'bold' }}>📧 Google</span>
          ) : (
            <span style={{ fontWeight: 'bold' }}>👤 Manueller Account {user.email && <span style={{ opacity: 0.7, fontWeight: 'normal' }}>({user.email})</span>}</span>
          )}
        </div>
      </div>

      {member ? (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Member Details Card */}
          <div style={{ flex: '1 1 400px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>GW2 Charakter-Daten</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>

              <div>
                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Account Name</label>
                <div style={{ fontWeight: 'bold' }}>{member.accountName}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Status</label>
                <div>
                  <span className={`status-badge status-${member.status.toLowerCase()}`}>
                    {member.status}
                  </span>
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Kampfgilde aktiv?</label>
                <div>{member.wvwMember ? '✅ Ja' : '❌ Nein'}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Allianz Mitglied?</label>
                <div>{member.isAllianceMember ? '✅ Ja' : '❌ Nein'}</div>
              </div>
              {member.invitedBy && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Eingeladen von</label>
                  <div>{member.invitedBy}</div>
                </div>
              )}
            </div>

            <h3 style={{ marginTop: '1.5rem', fontSize: '1rem', opacity: 0.9 }}>Gilden & Ränge</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {member.guilds.map((mg) => (
                <div key={mg.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px' }}>
                  <strong style={{ color: mg.guild.isAllianceGuild ? 'var(--accent-color)' : 'inherit' }}>
                    {mg.guild.name} [{mg.guild.tag}]
                  </strong>
                  <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Rang: {mg.rank}</div>
                </div>
              ))}
              {member.guilds.length === 0 && <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>Keinen Gilden zugeordnet.</p>}
            </div>
            
            {member.manualRole && (
              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Zugewiesene Rolle</label>
                <div style={{ marginTop: '0.3rem' }}><span className="badge">{member.manualRole}</span></div>
              </div>
            )}
            
            {/* Note: Administrative comments (member.comment) are strictly hidden for privacy as requested */}
          </div>

          {/* Activity History Card */}
          <div style={{ flex: '1 1 300px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Letzte Aktivitäten</h3>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
              {member.history
                .filter((item: any) => !["COMMENT_ADDED", "COMMENT_CHANGED"].includes(item.eventType))
                .map((item: any) => (
                  <li key={item.id} style={{ marginBottom: '1rem', borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem', fontSize: '0.9rem' }}>
                    <DateDisplay 
                      date={item.createdAt} 
                      style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block' }} 
                    />
                    <strong>{item.eventType.replace(/_/g, ' ')}</strong>
                    {item.newValue && <div style={{ opacity: 0.8, fontSize: '0.85rem' }}>➔ {item.newValue}</div>}
                  </li>
              ))}
              {member.history.length === 0 && <p style={{ opacity: 0.5 }}>Noch keine Aktivitäten aufgezeichnet.</p>}
            </ul>
          </div>
        </div>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          <p>Sie haben noch keinen GW2-Account verknüpft. Bitte nutzen Sie das untenstehende Formular.</p>
        </div>
      )}

      {/* Account Settings / Link Management */}
      <ProfileClient isLinked={!!member} userRole={user.role} />
    </div>
  );
}
