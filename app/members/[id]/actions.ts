"use server";
import { db } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { canEditMember, AuthUser } from "@/lib/permissions";

export async function updateMemberComment(data: FormData) {
  const session = (await getServerSession(authOptions)) as { user: AuthUser } | null;
  const memberId = data.get("memberId") as string;
  const comment = data.get("comment") as string;
  const manualRole = data.get("manualRole") as string;

  const memberRef = db.collection("members").doc(memberId);
  const doc = await memberRef.get();
  if (!doc.exists) return;
  const oldMem = doc.data() as any;

  const memberGuildIds = (oldMem.guilds || []).map((g: any) => g.id);

  if (!canEditMember(session?.user as any, memberGuildIds, oldMem.isAllianceMember, oldMem.leftAt, oldMem.pastGuildIds, oldMem.wasAllianceMember)) {
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

  await memberRef.update({ 
    comment: normalizedNewComment || null, 
    manualRole: normalizedNewRole || null 
  });

  if (commentChanged) {
    await memberRef.collection("history").add({
        eventType: "COMMENT_CHANGED",
        description: "Kommentar aktualisiert",
        oldValue: oldMem.comment || null,
        newValue: normalizedNewComment || null,
        timestamp: new Date()
    });
  }

  if (roleChanged) {
    await memberRef.collection("history").add({
        eventType: "MANUAL_ROLE_CHANGED",
        description: "Manuelle Rolle geändert",
        oldValue: oldMem.manualRole || null,
        newValue: normalizedNewRole || null,
        timestamp: new Date()
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

  const memberRef = db.collection("members").doc(memberId);
  const memberDoc = await memberRef.get();
  if (!memberDoc.exists) throw new Error("Mitglied nicht gefunden.");
  
  const oldMem = memberDoc.data() as any;
  const memberGuildIds = (oldMem.guilds || []).map((g: any) => g.id);

  if (!canEditMember(session?.user as any, memberGuildIds, oldMem.isAllianceMember, oldMem.leftAt, oldMem.pastGuildIds, oldMem.wasAllianceMember)) {
    throw new Error("Nicht autorisiert.");
  }

  const guildDoc = await db.collection("guilds").doc(guildId).get();
  if (!guildDoc.exists || !guildDoc.data()?.isManual) {
    throw new Error("Gilde nicht gefunden oder nicht manuell.");
  }
  const guild = guildDoc.data()!;

  // memberRef already retrieved above
  
  const existingGuilds = memberDoc.data()?.guilds || [];
  
  const newGuilds = [...existingGuilds, {
      id: guildId,
      name: guild.name,
      tag: guild.tag,
      rank,
      lastSeenAt: new Date(),
      isManual: true
  }];

  await memberRef.update({
    guilds: newGuilds,
    guildIds: newGuilds.map((g: any) => g.id)
  });

  await memberRef.collection("history").add({
      eventType: "JOINED",
      newValue: `${guild.name} [${guild.tag}] (Manuell)`,
      timestamp: new Date()
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members`);
}

export async function removeMemberFromManualGuild(data: FormData) {
  const session = (await getServerSession(authOptions)) as { user: AuthUser } | null;
  const memberId = data.get("memberId") as string;
  const guildId = data.get("guildId") as string;

  const memberRef = db.collection("members").doc(memberId);
  const memberDoc = await memberRef.get();
  if (!memberDoc.exists) throw new Error("Mitglied nicht gefunden.");
  
  const memberData = memberDoc.data() as any;
  const memberGuildIds = (memberData.guilds || []).map((g: any) => g.id);

  if (!canEditMember(session?.user as any, memberGuildIds, memberData.isAllianceMember, memberData.leftAt, memberData.pastGuildIds, memberData.wasAllianceMember)) {
    throw new Error("Nicht autorisiert.");
  }

  const guildToRemove = (memberData.guilds || []).find((g: any) => g.id === guildId);
  
  if (!guildToRemove) throw new Error("Zuordnung nicht gefunden.");

  const remainingGuilds = memberData.guilds.filter((g: any) => g.id !== guildId);

  const updateData: any = {
    guilds: remainingGuilds,
    guildIds: remainingGuilds.map((g: any) => g.id)
  };

  if (remainingGuilds.length === 0) {
    updateData.status = "INACTIVE_KICKED";
    updateData.isAllianceMember = false;
    updateData.wvwMember = false;
    updateData.leftAt = new Date();
    updateData.pastGuildIds = memberGuildIds;
    updateData.wasAllianceMember = memberData.isAllianceMember || false;
  }

  await memberRef.update(updateData);

  await memberRef.collection("history").add({
      eventType: "KICKED",
      description: `Manuell entfernt (durch ${(session?.user as any)?.name || "Admin"})`,
      newValue: `${guildToRemove.name} [${guildToRemove.tag}] (Manuell)`,
      timestamp: new Date()
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members`);
}

export async function updateDiscordName(data: FormData) {
  const session = (await getServerSession(authOptions)) as { user: AuthUser } | null;
  const memberId = data.get("memberId") as string;
  let customDiscordName = data.get("customDiscordName") as string;
  
  if (customDiscordName && customDiscordName.trim() === "") {
    customDiscordName = "";
  }

  const memberRef = db.collection("members").doc(memberId);
  const doc = await memberRef.get();
  if (!doc.exists) return;
  const oldMem = doc.data() as any;

  const memberGuildIds = (oldMem.guilds || []).map((g: any) => g.id);

  // Check if member is linked to a user
  const linkedUserSnapshot = await db.collection("users").where("memberId", "==", memberId).limit(1).get();
  const linkedUser = linkedUserSnapshot.empty ? null : linkedUserSnapshot.docs[0];

  const isMe = session?.user?.id && session.user.id === linkedUser?.id;
  const hasEditPerms = canEditMember(session?.user as any, memberGuildIds, oldMem.isAllianceMember, oldMem.leftAt, oldMem.pastGuildIds, oldMem.wasAllianceMember);

  if (!isMe && !hasEditPerms) {
    throw new Error("Nicht autorisiert, den Discord-Namen dieses Mitglieds zu bearbeiten.");
  }

  const normalize = (val: any) => (val || "").toString().replace(/\r\n/g, "\n").trim();
  const normalizedOldDiscord = normalize(oldMem.customDiscordName);
  const normalizedNewDiscord = normalize(customDiscordName);

  if (normalizedOldDiscord === normalizedNewDiscord) return;

  await memberRef.update({ customDiscordName: normalizedNewDiscord || null });

  await memberRef.collection("history").add({
      eventType: "DISCORD_NAME_CHANGED",
      description: "Discord-Name angepasst",
      oldValue: oldMem.customDiscordName || null,
      newValue: normalizedNewDiscord || null,
      timestamp: new Date()
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members`);
}
