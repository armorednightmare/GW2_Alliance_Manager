"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import "./Sidebar.css";
import SidebarClient from "./SidebarClient";
import { useSession } from "next-auth/react";
import { useLanguage } from "./LanguageContext";

export default function Sidebar(): JSX.Element {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        
        {/* Build & Version Info */}
        <div style={{
          marginTop: "1rem",
          padding: "0.5rem 0.8rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          fontSize: "0.72rem",
          color: "rgba(255, 255, 255, 0.35)",
          fontFamily: "monospace",
          lineHeight: "1.4"
        }}>
          <div>Version: <span style={{ color: "var(--accent-color)", opacity: 0.8 }}>{process.env.NEXT_PUBLIC_GIT_COMMIT_HASH || "unknown"}</span></div>
          <div style={{ fontSize: "0.68rem" }}>
            Build: {isMounted && process.env.NEXT_PUBLIC_BUILD_DATE ? new Date(process.env.NEXT_PUBLIC_BUILD_DATE).toLocaleString("de-DE") : "..."}
          </div>
        </div>
      </div>
    </SidebarClient>
  );
}
