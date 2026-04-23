"use client";

import { useSidebar } from "./SidebarContext";
import "./Sidebar.css";

interface SidebarClientProps {
  children: React.ReactNode;
}

export default function SidebarClient({ children }: SidebarClientProps) {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Overlay behind the sidebar on mobile */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* The actual sidebar */}
      <aside className={`main-sidebar${isOpen ? " main-sidebar--open" : ""}`}>
        {/* Close button inside sidebar on mobile */}
        <button
          className="sidebar-close"
          onClick={close}
          aria-label="Navigation schließen"
        >
          ✕
        </button>
        {children}
      </aside>
    </>
  );
}
