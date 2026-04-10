"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AuthUser, canSeeRank, getHistoryVisibilityFilter } from "@/lib/permissions";


export async function fetchHistoryLogs(page: number, limit: number, search: string) {
  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (search.trim()) {
    const s = search.toLowerCase();

    whereClause.OR = [
      { member: { accountName: { contains: s, mode: "insensitive" } } },
      { oldValue: { contains: s, mode: "insensitive" } },
      { newValue: { contains: s, mode: "insensitive" } }
    ];

    const enumValues = ["JOINED", "LEFT", "RANK_CHANGE", "WVW_STATUS_CHANGE", "COMMENT_ADDED", "COMMENT_CHANGED"];
    const matchingEnums = enumValues.filter(v => v.toLowerCase().includes(s));

    if (matchingEnums.length > 0) {
      whereClause.OR.push({ eventType: { in: matchingEnums as any } });
    }
  }

  const session = await getServerSession(authOptions);
  const user = (session as any)?.user as AuthUser | undefined;
  const historyFilter = await getHistoryVisibilityFilter(user);


  const finalWhere = {
    AND: [whereClause, historyFilter]
  };

  const [data, total] = await Promise.all([
    prisma.memberHistory.findMany({
      where: finalWhere,
      include: { member: { include: { guilds: { include: { guild: true } } } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.memberHistory.count({ where: finalWhere })
  ]);

  // Mask rank changes
  const maskedData = data.map(h => {
    if (h.eventType === "RANK_CHANGE") {
      const tagMatch = h.newValue?.match(/\(([^)]+)\)/) || h.oldValue?.match(/\(([^)]+)\)/);
      if (tagMatch) {
         const tag = tagMatch[1];
         const guild = h.member?.guilds.find((mg: any) => mg.guild.tag === tag);
         if (guild && !canSeeRank(user, guild.guild)) {
           return {
             ...h,
             oldValue: h.oldValue ? "" : null,
             newValue: h.newValue ? "" : null
           };
         }
      }
    }
    return h;
  });

  return { data: maskedData, total };
}
