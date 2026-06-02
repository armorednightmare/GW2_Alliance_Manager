"use client";
import Link from "next/link";
import "./Sidebar.css";
import SidebarClient from "./SidebarClient";
import { useSession } from "next-auth/react";
import { useLanguage } from "./LanguageContext";

export default function Sidebar(): JSX.Element {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const user = (session?.user as any);
  const role = user?.role;
  const isAdmin = role === "ADMIN" || role === "ALLIANCE_LEADER" || role === "GUILD_LEADER";
  const isNewUser = role === "NEW_USER";

  return (
    <SidebarClient>
      <nav>
        <ul>
          {!isNewUser && (
            <>
              <li><Link href="/">{t("dashboard")}</Link></li>
              <li><Link href="/guilds">{t("guilds")}</Link></li>
              <li><Link href="/members">{t("members")}</Link></li>
              <li><Link href="/history">{t("history")}</Link></li>
            </>
          )}
        </ul>
      </nav>

      <div className="sidebar-account-nav">
        {isAdmin && (
          <Link href="/admin" className="footer-link">
            <span className="icon">⚙️ {t("admin")}</span>
          </Link>
        )}
        {session && (
          <Link href="/profile" className="footer-link">
            <span className="icon">👤 {t("profile")}</span>
          </Link>
        )}
      </div>

      <div className="sidebar-footer">
        <Link href="/docs/USER_GUIDE" className="footer-link">
          <span className="icon">📚 Dokumentation</span>
        </Link>
      </div>
    </SidebarClient>
  );
}
