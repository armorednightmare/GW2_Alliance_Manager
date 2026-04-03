import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "./components/Providers";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { prisma } from "@/lib/prisma";

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
    settings = await prisma.systemSettings.findFirst();
  } catch (e) {}

  const customStyle = settings ? {
    "--primary-color": settings.colorPrimary,
    "--accent-color": settings.colorAccent,
    "--bg-color": settings.colorBg,
  } as React.CSSProperties : {};

  let allianceName = settings?.allianceName;
  if (!allianceName) {
    const allianceGuild = await prisma.guild.findFirst({ where: { isAllianceGuild: true } });
    allianceName = allianceGuild ? `${allianceGuild.name} [${allianceGuild.tag}]` : "Allianz Manager";
  }

  const logoUrl = settings?.logoUrl || null;

  return (
    <html lang="de">
      <body className={inter.className} style={customStyle}>
        <Providers>
          <div className="app-wrapper">
            <Header allianceName={allianceName} logoUrl={logoUrl} />
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
