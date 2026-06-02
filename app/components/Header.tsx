"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import "./Header.css";
import { useSidebar } from "./SidebarContext";
import { useLanguage } from "./LanguageContext";

interface HeaderProps {
  allianceName?: string;
  logoUrl?: string | null;
}

export default function Header({ allianceName = "Alliance Manager", logoUrl }: HeaderProps) {
  const { data: session } = useSession();
  const { isOpen, toggle } = useSidebar();
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="main-header">
      <div className="logo-area">
        {/* Hamburger toggle – only visible on mobile via CSS */}
        {session && (
          <button
            className={`sidebar-toggle${isOpen ? " sidebar-toggle--active" : ""}`}
            onClick={toggle}
            aria-label={isOpen ? t("closeNav") : t("openNav")}
            aria-expanded={isOpen}
          >
            <span />
            <span />
            <span />
          </button>
        )}

        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
          {logoUrl && (
            <Image
              src={logoUrl}
              alt="Alliance Logo"
              width={40}
              height={40}
              className="alliance-logo"
            />
          )}
          <h2 style={{ margin: 0 }}>{allianceName}</h2>
        </Link>
      </div>

      <div className="auth-area">
        {/* Language switcher */}
        <div className="lang-switcher" aria-label="Language switcher">
          <button
            id="lang-de"
            className={`lang-btn${lang === "de" ? " lang-btn--active" : ""}`}
            onClick={() => setLang("de")}
            title="Deutsch"
            aria-pressed={lang === "de"}
          >
            DE
          </button>
          <button
            id="lang-en"
            className={`lang-btn${lang === "en" ? " lang-btn--active" : ""}`}
            onClick={() => setLang("en")}
            title="English"
            aria-pressed={lang === "en"}
          >
            EN
          </button>
        </div>

        {session ? (
          <>
            <span className="user-greeting">
              {t("loggedInAs")} {session.user?.name || session.user?.email} ({(session.user as any)?.role})
            </span>
            <button className="btn-logout" onClick={() => signOut()}>{t("logout")}</button>
          </>
        ) : (
          <Link href="/login" className="btn-login">{t("login")}</Link>
        )}
      </div>
    </header>
  );
}
