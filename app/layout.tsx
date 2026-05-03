export const dynamic = 'force-dynamic';
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "./components/Providers";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { db } from "@/lib/firebase-admin";

const inter = Inter({ subsets: ["latin"] });

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "GW2 Alliance Manager",
  description: "Alliance & WvW Management Tool for Guild Wars 2",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions) as any;
  
  let settings = null;
  try {
    const settingsSnapshot = await db.collection("settings").doc("system").get();
    settings = settingsSnapshot.exists ? settingsSnapshot.data() : null;
  } catch (e) {}

  const customStyle = settings ? {
    "--primary-color": settings.colorPrimary,
    "--accent-color": settings.colorAccent,
    "--bg-color": settings.colorBg,
  } as React.CSSProperties : {};

  let allianceName = settings?.allianceName;
  if (!allianceName) {
    let allianceGuild = null;
    try {
      const allianceGuildSnapshot = await db.collection("guilds").where("isAllianceGuild", "==", true).limit(1).get();
      allianceGuild = allianceGuildSnapshot.empty ? null : allianceGuildSnapshot.docs[0].data();
    } catch (e) {}
    allianceName = allianceGuild ? `${allianceGuild.name} [${allianceGuild.tag}]` : "Allianz Manager";
  }

  const logoUrl = settings?.logoUrl || null;
  
  const safeAllianceName = String(allianceName || "Allianz Manager");
  const safeLogoUrl = logoUrl ? String(logoUrl) : null;
  const safeCustomStyle = JSON.parse(JSON.stringify(customStyle));

  return (
    <html lang="de">
      <body className={inter.className} style={safeCustomStyle}>
        <Providers>
          <div className="app-wrapper">
            <Header allianceName={safeAllianceName} logoUrl={safeLogoUrl} />
            <div className="main-content">
              {session && <Sidebar />}
              <main className="page-content">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
