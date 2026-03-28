import Link from "next/link";
import "./Sidebar.css";
// import server session to check role
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function Sidebar() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "ALLIANCE_LEADER" || role === "GUILD_LEADER";

  return (
    <aside className="main-sidebar">
      <nav>
        <ul>
          <li><Link href="/">Dashboard</Link></li>
          <li><Link href="/guilds">Gilden</Link></li>
          <li><Link href="/members">Mitglieder</Link></li>
          <li><Link href="/history">Historie</Link></li>
          {isAdmin && (
            <li><Link href="/admin">Admin Panel</Link></li>
          )}
          {session && (
            <li><Link href="/profile">Mein Profil (API Key)</Link></li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
