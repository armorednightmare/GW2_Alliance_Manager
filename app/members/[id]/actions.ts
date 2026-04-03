"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { canEditMember, AuthUser } from "@/lib/permissions";

export async function updateMemberComment(data: FormData) {
  const session = (await getServerSession(authOptions)) as { user: AuthUser } | null;
  const memberId = data.get("memberId") as string;
  const comment = data.get("comment") as string;
  const manualRole = data.get("manualRole") as string;

  const oldMem = await prisma.member.findUnique({ where: { id: memberId } });
  if (!oldMem) return;

  // Security Check
  if (!canEditMember(session?.user as any, oldMem.guildId)) {
    throw new Error("Nicht autorisiert, dieses Mitglied zu bearbeiten.");
  }

  await prisma.member.update({
    where: { id: memberId },
    data: { comment, manualRole }
  });

  if (oldMem.comment !== comment) {
    await prisma.memberHistory.create({
      data: {
        memberId: memberId,
        eventType: "COMMENT_CHANGED",
        oldValue: oldMem.comment,
        newValue: comment
      }
    });
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members`);
}
