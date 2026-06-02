"use client";
import { SessionProvider } from "next-auth/react";
import { SidebarProvider } from "./SidebarContext";
import { LanguageProvider } from "./LanguageContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
