import { prisma } from "@/lib/prisma";
import Link from "next/link";
import "./Dashboard.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getHistoryVisibilityFilter } from "@/lib/permissions";

export default async function Dashboard() {
  const activeMembersInDanger = await prisma.member.findMany({
    where: { isAllianceMember: true, wvwMember: false, status: "ACTIVE" },
    include: { guilds: { include: { guild: true } } }
  });

  const totalMembers = await prisma.member.count({ where: { status: "ACTIVE", isAllianceMember: true } });
  const totalSubGuilds = await prisma.guild.count({ where: { isAllianceGuild: false } });
  const settings = await prisma.systemSettings.findFirst();

  let allianceName = settings?.allianceName;
  if (!allianceName) {
    const allianceGuild = await prisma.guild.findFirst({ where: { isAllianceGuild: true } });
    allianceName = allianceGuild ? `${allianceGuild.name} [${allianceGuild.tag}]` : "Allianz Manager";
  }

  const session = await getServerSession(authOptions);

  const historyWhere = await getHistoryVisibilityFilter((session as any)?.user);


  const recentHistory = await prisma.memberHistory.findMany({
    where: historyWhere,
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { member: true }
  });

  return (
    <div className="dashboard-container">
      <h1>{allianceName} Dashboard</h1>

      <div className="stats-row">
        <div className="stat-card">
          <h3>Aktive Spieler</h3>
          <p className="stat-value">{totalMembers}</p>
        </div>
        <div className="stat-card">
          <h3>Gilden in der Allianz</h3>
          <p className="stat-value">{totalSubGuilds}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panels-column">
          <div className={`alert-panel ${activeMembersInDanger.length === 0 ? 'success' : ''}`}>
            <h2>{activeMembersInDanger.length === 0 ? '✅' : '⚠️'} WvW Alarm ({activeMembersInDanger.length})</h2>
            <p style={{ opacity: 0.8, marginBottom: '1rem' }}>
              Folgende Spieler sind aktuell in der <strong>Allianzgilde</strong>, haben diese aber <strong>nicht</strong> als Kampfgilde markiert.
            </p>

            {activeMembersInDanger.length === 0 ? (
              <div className="success-msg">Alle aktiven Spieler haben die WvW-Gilde ausgewählt! 🎉</div>
            ) : (
              <ul className="danger-list">
                {activeMembersInDanger.map((m: any) => (
                  <li key={m.id}>
                    <strong>{m.accountName}</strong>
                    <span className="guild-tag">
                      {m.guilds?.map((mg: any) => `[${mg.guild.tag}]`).join(' ')}
                    </span>
                    <Link href={`/members/${m.id}`} className="btn-small">Profil</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="history-panel">
          <h2>Letzte Aktivitäten</h2>
          <ul className="history-list">
            {recentHistory.map((h: any) => (
              <li key={h.id} style={{ padding: 0 }}>
                <Link
                  href={`/history#hist-${h.id}`}
                  style={{ display: "flex", alignItems: "center", width: "100%", padding: "0.8rem", color: "inherit", textDecoration: "none" }}
                >
                  <span className="time" style={{ marginRight: '1rem', opacity: 0.7 }} suppressHydrationWarning>{h.createdAt.toLocaleTimeString('de-DE')}</span>
                  <span className="event">{h.member.accountName} ➔ {h.eventType.replace(/_/g, ' ')}</span>
                </Link>
              </li>
            ))}

          </ul>
        </div>
      </div>
    </div>
  );
}
