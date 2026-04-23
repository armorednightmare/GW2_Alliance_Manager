"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import "./Header.css";
import { useSidebar } from "./SidebarContext";

interface HeaderProps {
  allianceName?: string;
  logoUrl?: string | null;
}

export default function Header({ allianceName = "Alliance Manager", logoUrl }: HeaderProps) {
  const { data: session } = useSession();
  const { isOpen, toggle } = useSidebar();

  return (
    <header className="main-header">
      <div className="logo-area">
        {/* Hamburger toggle – only visible on mobile via CSS */}
        {session && (
          <button
            className={`sidebar-toggle${isOpen ? " sidebar-toggle--active" : ""}`}
            onClick={toggle}
            aria-label={isOpen ? "Navigation schließen" : "Navigation öffnen"}
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
        {session ? (
          <>
            <span className="user-greeting">
              Eingeloggt als {session.user?.name || session.user?.email} ({(session.user as any)?.role})
            </span>
            <button className="btn-logout" onClick={() => signOut()}>Logout</button>
          </>
        ) : (
          <Link href="/login" className="btn-login">Login</Link>
        )}
      </div>
    </header>
  );
}
