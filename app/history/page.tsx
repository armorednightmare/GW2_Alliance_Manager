import { prisma } from "@/lib/prisma";
import HistoryClient from "./HistoryClient";
import "../members/Members.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getHistoryVisibilityFilter, AuthUser, canSeeRank } from "@/lib/permissions";

export default async function HistoryPage() {
  const limit = 50;
  const session = await getServerSession(authOptions);
  const user = (session as any)?.user as AuthUser | undefined;

  const where = await getHistoryVisibilityFilter(user);

  const [history, initialTotal] = await Promise.all([
    prisma.memberHistory.findMany({
      where,
      include: { member: { include: { guilds: { include: { guild: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: limit
    }),
    prisma.memberHistory.count({ where })
  ]);

  // Mask rank changes
  const maskedHistory = history.map(h => {
    if (h.eventType === "RANK_CHANGE") {
      const tagMatch = h.newValue?.match(/\(([^)]+)\)/) || h.oldValue?.match(/\(([^)]+)\)/);
      if (tagMatch) {
         const tag = tagMatch[1];
         const guild = h.member?.guilds.find((mg: any) => mg.guild.tag === tag);
         if (guild && !canSeeRank(user, guild.guildId)) {
           return {
             ...h,
             oldValue: h.oldValue ? "Versteckt" : null,
             newValue: h.newValue ? "Versteckt" : null
           };
         }
      }
    }
    return h;
  });

  return (
    <div>
      <h1 style={{ textShadow: "0 0 15px rgba(102, 252, 241, 0.4)" }}>Allianz Historie</h1>
      <p style={{ opacity: 0.8 }}>Hier sehen Sie die Aktivitäten aller Mitglieder (Beitritte, Austritte, Änderungen des WvW-Status).</p>

      <div className="table-wrapper">
        <HistoryClient initialHistory={maskedHistory} initialTotal={initialTotal} />
      </div>
    </div>
  );
}
