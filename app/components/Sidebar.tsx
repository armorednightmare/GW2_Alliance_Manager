import Link from "next/link";
import "./Sidebar.css";
import SidebarClient from "./SidebarClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function Sidebar(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions) as any;
  const user = session?.user;
  const role = user?.role;
  const isAdmin = role === "ADMIN" || role === "ALLIANCE_LEADER" || role === "GUILD_LEADER";

  return (
    <SidebarClient>
      <nav>
        <ul>
          <li><Link href="/">Dashboard</Link></li>
          <li><Link href="/guilds">Gilden</Link></li>
          <li><Link href="/members">Mitglieder</Link></li>
          <li><Link href="/history">Historie</Link></li>
        </ul>
      </nav>

      <div className="sidebar-account-nav">
        {isAdmin && (
          <Link href="/admin" className="footer-link">
            <span className="icon">⚙️ Admin Panel</span>
          </Link>
        )}
        {session && (
          <Link href="/profile" className="footer-link">
            <span className="icon">👤 Mein Profil (API Key)</span>
          </Link>
        )}
      </div>

      <div className="sidebar-footer">
        <Link
          href="/docs/USER_GUIDE"
          className="footer-link"
        >
          <span className="icon">📚 Dokumentation</span>
        </Link>
      </div>
    </SidebarClient>
  );
}
