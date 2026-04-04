"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getHistoryVisibilityFilter } from "@/lib/permissions";


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
  const historyFilter = await getHistoryVisibilityFilter((session as any)?.user);


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


  return { data, total };
}
