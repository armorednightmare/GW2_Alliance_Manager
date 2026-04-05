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

  const oldMem = await prisma.member.findUnique({ 
    where: { id: memberId },
    include: { guilds: { select: { guildId: true } } }
  });
  if (!oldMem) return;

  const memberGuildIds = oldMem.guilds.map(g => g.guildId);

  // Security Check
  if (!canEditMember(session?.user as any, memberGuildIds)) {
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

export async function addMemberToManualGuild(data: FormData) {
  const session = (await getServerSession(authOptions)) as { user: AuthUser } | null;
  const memberId = data.get("memberId") as string;
  const guildId = data.get("guildId") as string;
  const rank = data.get("rank") as string || "Member";

  if (!canEditMember(session?.user as any, [])) {
    throw new Error("Nicht autorisiert.");
  }

  const guild = await prisma.guild.findFirst({ where: { id: guildId, isManual: true } });
  if (!guild) throw new Error("Gilde nicht gefunden oder nicht manuell.");

  await prisma.memberGuild.create({
    data: {
      memberId,
      guildId,
      rank
    }
  });

  await prisma.memberHistory.create({
    data: { 
      memberId, 
      eventType: "JOINED", 
      newValue: `${guild.name} [${guild.tag}] (Manuell)` 
    }
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members`);
}

export async function removeMemberFromManualGuild(data: FormData) {
  const session = (await getServerSession(authOptions)) as { user: AuthUser } | null;
  const memberGuildId = data.get("memberGuildId") as string;

  if (!canEditMember(session?.user as any, [])) {
    throw new Error("Nicht autorisiert.");
  }

  const mg = await prisma.memberGuild.findUnique({ 
    where: { id: memberGuildId },
    include: { guild: true }
  });
  if (!mg || !mg.guild.isManual) throw new Error("Zuordnung nicht gefunden oder nicht manuell.");

  await prisma.memberGuild.delete({ where: { id: memberGuildId } });

  await prisma.memberHistory.create({
    data: { 
      memberId: mg.memberId, 
      eventType: "LEFT", 
      newValue: `${mg.guild.name} [${mg.guild.tag}] (Manuell)` 
    }
  });

  revalidatePath(`/members/${mg.memberId}`);
  revalidatePath(`/members`);
}

export async function updateDiscordName(data: FormData) {
  const session = (await getServerSession(authOptions)) as { user: AuthUser } | null;
  const memberId = data.get("memberId") as string;
  let customDiscordName = data.get("customDiscordName") as string;
  
  if (customDiscordName && customDiscordName.trim() === "") {
    customDiscordName = "";
  }

  const oldMem = await prisma.member.findUnique({ 
    where: { id: memberId },
    include: { guilds: { select: { guildId: true } }, linkedUser: true }
  });
  if (!oldMem) return;

  const memberGuildIds = oldMem.guilds.map(g => g.guildId);

  const isMe = session?.user?.id && session.user.id === oldMem.linkedUser?.id;
  const hasEditPerms = canEditMember(session?.user as any, memberGuildIds);

  if (!isMe && !hasEditPerms) {
    throw new Error("Nicht autorisiert, den Discord-Namen dieses Mitglieds zu bearbeiten.");
  }

  await prisma.member.update({
    where: { id: memberId },
    data: { customDiscordName: customDiscordName || null }
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members`);
}
