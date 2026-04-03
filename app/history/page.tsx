import { prisma } from "@/lib/prisma";
import HistoryClient from "./HistoryClient";
import "../members/Members.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getHistoryVisibilityFilter } from "@/lib/permissions";

export default async function HistoryPage() {
  const limit = 50;
  const session = await getServerSession(authOptions);

  const where = await getHistoryVisibilityFilter((session as any)?.user);



  const [history, initialTotal] = await Promise.all([
    prisma.memberHistory.findMany({
      where,
      include: { member: { include: { guild: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit
    }),
    prisma.memberHistory.count({ where })
  ]);

  return (
    <div>
      <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)" }}>Allianz Historie</h1>
      <p style={{ opacity: 0.8 }}>Hier sehen Sie die Aktivitäten aller Mitglieder (Beitritte, Austritte, Änderungen des WvW-Status).</p>

      <div className="table-wrapper">
        <HistoryClient initialHistory={history} initialTotal={initialTotal} />
      </div>
    </div>
  );
}
