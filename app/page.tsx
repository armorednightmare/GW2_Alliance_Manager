export const dynamic = 'force-dynamic';
import { db } from "@/lib/firebase-admin";
import Link from "next/link";
import "./Dashboard.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHistoryVisibilityFilter } from "@/lib/permissions";
import { sanitizeData } from "@/lib/utils";
import DateDisplay from "./components/DateDisplay";

export default async function Dashboard() {
  const membersRef = db.collection("members");
  
  const inDangerSnapshot = await membersRef
    .where("isAllianceMember", "==", true)
    .where("wvwMember", "==", false)
    .where("status", "==", "ACTIVE")
    .get();
  
  const activeMembersInDanger = inDangerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const totalMembersSnapshot = await membersRef
    .where("status", "==", "ACTIVE")
    .where("isAllianceMember", "==", true)
    .count().get();
  const totalMembers = totalMembersSnapshot.data().count;

  const totalSubGuildsSnapshot = await db.collection("guilds")
    .where("isAllianceGuild", "==", false)
    .count().get();
  const totalSubGuilds = totalSubGuildsSnapshot.data().count;

  const settingsDoc = await db.collection("settings").doc("system").get();
  const settings = settingsDoc.exists ? settingsDoc.data() : null;

  let allianceName = settings?.allianceName;
  if (!allianceName) {
    const allianceGuildSnapshot = await db.collection("guilds").where("isAllianceGuild", "==", true).limit(1).get();
    const allianceGuild = allianceGuildSnapshot.empty ? null : allianceGuildSnapshot.docs[0].data();
    allianceName = allianceGuild ? `${allianceGuild.name} [${allianceGuild.tag}]` : "Allianz Manager";
  }

  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Note: collectionGroup requires an index in Firestore for filtering/ordering
  // We wrap this in try-catch to avoid crashing the whole dashboard if the index isn't ready
  let recentHistory: any[] = [];
  try {
    const recentHistorySnapshot = await db.collectionGroup("history")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    recentHistory = await Promise.all(recentHistorySnapshot.docs.map(async (doc) => {
      const data = doc.data();
      const memberDoc = await doc.ref.parent.parent?.get();
      return sanitizeData({
        id: doc.id,
        ...data,
        createdAt: data.timestamp?.toDate() || new Date(),
        member: memberDoc?.data() || { accountName: "Unbekannt" }
      });
    }));
  } catch (error) {
    console.error("Error fetching recent history (Check if Firestore index is created):", error);
  }

  const sanitizedDangerMembers = sanitizeData(activeMembersInDanger);

  return (
    <div className="dashboard-container">
      <h1>{allianceName} Dashboard</h1>

      <div className="stats-row">
        <Link href="/members" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <h3>Mitglieder</h3>
          <p className="stat-value">{totalMembers}</p>
        </Link>
        <Link href="/guilds" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <h3>Gilden</h3>
          <p className="stat-value">{totalSubGuilds}</p>
        </Link>
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
                {sanitizedDangerMembers.map((m: any) => (
                  <li key={m.id}>
                    <strong>{m.accountName}</strong>
                    <span className="guild-tag">
                      {(m.guilds || []).map((mg: any) => `[${mg.tag}]`).join(' ')}
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
                    <DateDisplay 
                      date={h.createdAt} 
                      className="time" 
                      style={{ marginRight: '1rem', opacity: 0.7 }} 
                    />
                    <span className="event">{h.member?.accountName || "Unbekannt"} ➔ {(h.eventType || h.type || "").replace(/_/g, ' ')}</span>
                  </Link>
              </li>
            ))}

          </ul>
        </div>
      </div>
    </div>
  );
}
