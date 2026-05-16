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
  if (!canEditMember(session?.user as any, memberGuildIds, oldMem.isAllianceMember)) {
    throw new Error("Nicht autorisiert, dieses Mitglied zu bearbeiten.");
  }

  // Normalize line endings and trim for comparison
  const normalize = (val: any) => (val || "").toString().replace(/\r\n/g, "\n").trim();

  const normalizedOldComment = normalize(oldMem.comment);
  const normalizedNewComment = normalize(comment);
  const normalizedOldRole = normalize(oldMem.manualRole);
  const normalizedNewRole = normalize(manualRole);

  const commentChanged = normalizedOldComment !== normalizedNewComment;
  const roleChanged = normalizedOldRole !== normalizedNewRole;

  if (!commentChanged && !roleChanged) return;

  await prisma.member.update({
    where: { id: memberId },
    data: { 
      comment: normalizedNewComment || null, 
      manualRole: normalizedNewRole || null 
    }
  });

  if (commentChanged) {
    await prisma.memberHistory.create({
      data: {
        memberId: memberId,
        eventType: "COMMENT_CHANGED",
        oldValue: oldMem.comment,
        newValue: normalizedNewComment || null
      }
    });
  }

  if (roleChanged) {
    await prisma.memberHistory.create({
      data: {
        memberId: memberId,
        eventType: "MANUAL_ROLE_CHANGED",
        oldValue: oldMem.manualRole,
        newValue: normalizedNewRole || null
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

  const oldMem = await prisma.member.findUnique({ 
    where: { id: memberId },
    include: { guilds: { select: { guildId: true } } }
  });
  if (!oldMem) throw new Error("Mitglied nicht gefunden.");

  const memberGuildIds = oldMem.guilds.map(g => g.guildId);

  if (!canEditMember(session?.user as any, memberGuildIds, oldMem.isAllianceMember)) {
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

  const mg = await prisma.memberGuild.findUnique({ 
    where: { id: memberGuildId },
    include: { 
      guild: true,
      member: { include: { guilds: { select: { guildId: true } } } }
    }
  });
  if (!mg || !mg.guild.isManual) throw new Error("Zuordnung nicht gefunden oder nicht manuell.");

  const memberGuildIds = mg.member.guilds.map(g => g.guildId);
  if (!canEditMember(session?.user as any, memberGuildIds, mg.member.isAllianceMember)) {
    throw new Error("Nicht autorisiert.");
  }

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
  const hasEditPerms = canEditMember(session?.user as any, memberGuildIds, oldMem.isAllianceMember);

  if (!isMe && !hasEditPerms) {
    throw new Error("Nicht autorisiert, den Discord-Namen dieses Mitglieds zu bearbeiten.");
  }

  const normalize = (val: any) => (val || "").toString().replace(/\r\n/g, "\n").trim();
  const normalizedOldDiscord = normalize(oldMem.customDiscordName);
  const normalizedNewDiscord = normalize(customDiscordName);

  if (normalizedOldDiscord === normalizedNewDiscord) return;

  await prisma.member.update({
    where: { id: memberId },
    data: { customDiscordName: normalizedNewDiscord || null }
  });

  await prisma.memberHistory.create({
    data: {
      memberId: memberId,
      eventType: "DISCORD_NAME_CHANGED",
      oldValue: oldMem.customDiscordName,
      newValue: normalizedNewDiscord || null
    }
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members`);
}
