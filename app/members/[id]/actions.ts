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

  // Security Check
  if (!canEditMember(session?.user as any, memberGuildIds)) {
    throw new Error("Nicht autorisiert, dieses Mitglied zu bearbeiten.");
  }

  await memberRef.update({ comment, manualRole });

  // Only add history if something actually changed (normalized comparison)
  const normalizedOldComment = (oldMem.comment || "").trim();
  const normalizedNewComment = (comment || "").trim();
  if (normalizedOldComment !== normalizedNewComment) {
    await memberRef.collection("history").add({
        eventType: "COMMENT_CHANGED",
        description: "Kommentar aktualisiert",
        oldValue: oldMem.comment || null,
        newValue: normalizedNewComment || null,
        timestamp: new Date()
    });
  }

  const normalizedOldRole = (oldMem.manualRole || "").trim();
  const normalizedNewRole = (manualRole || "").trim();
  if (normalizedOldRole !== normalizedNewRole) {
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

  if (!canEditMember(session?.user as any, [])) {
    throw new Error("Nicht autorisiert.");
  }

  const guildDoc = await db.collection("guilds").doc(guildId).get();
  if (!guildDoc.exists || !guildDoc.data()?.isManual) {
    throw new Error("Gilde nicht gefunden oder nicht manuell.");
  }
  const guild = guildDoc.data()!;

  const memberRef = db.collection("members").doc(memberId);
  const memberDoc = await memberRef.get();
  if (!memberDoc.exists) throw new Error("Mitglied nicht gefunden.");
  
  const existingGuilds = memberDoc.data()?.guilds || [];
  
  await memberRef.update({
    guilds: [...existingGuilds, {
        id: guildId,
        name: guild.name,
        tag: guild.tag,
        rank,
        lastSeenAt: new Date(),
        isManual: true
    }]
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

  if (!canEditMember(session?.user as any, [])) {
    throw new Error("Nicht autorisiert.");
  }

  const memberRef = db.collection("members").doc(memberId);
  const memberDoc = await memberRef.get();
  if (!memberDoc.exists) throw new Error("Mitglied nicht gefunden.");
  
  const memberData = memberDoc.data() as any;
  const guildToRemove = (memberData.guilds || []).find((g: any) => g.id === guildId);
  
  if (!guildToRemove) throw new Error("Zuordnung nicht gefunden.");

  const remainingGuilds = memberData.guilds.filter((g: any) => g.id !== guildId);

  await memberRef.update({
    guilds: remainingGuilds
  });

  await memberRef.collection("history").add({
      eventType: "LEFT",
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
  const hasEditPerms = canEditMember(session?.user as any, memberGuildIds);

  if (!isMe && !hasEditPerms) {
    throw new Error("Nicht autorisiert, den Discord-Namen dieses Mitglieds zu bearbeiten.");
  }

  await memberRef.update({ customDiscordName: customDiscordName || null });

  const normalizedOldDiscord = (oldMem.customDiscordName || "").trim();
  const normalizedNewDiscord = (customDiscordName || "").trim();
  if (normalizedOldDiscord !== normalizedNewDiscord) {
    await memberRef.collection("history").add({
        eventType: "DISCORD_NAME_CHANGED",
        description: "Discord-Name angepasst",
        oldValue: oldMem.customDiscordName || null,
        newValue: normalizedNewDiscord || null,
        timestamp: new Date()
    });
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members`);
}
