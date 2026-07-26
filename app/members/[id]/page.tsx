import { db } from "@/lib/firebase-admin";
import "./MemberProfile.css";
import { notFound, redirect } from "next/navigation";
import { updateMemberComment, addMemberToManualGuild, removeMemberFromManualGuild, updateDiscordName } from "./actions";
import { getUserDiscordRoles } from "@/lib/discord";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { canEditMember, AuthUser, canSeeRank } from "@/lib/permissions";
import { sanitizeData } from "@/lib/utils";
import MemberDetailClient from "./MemberDetailClient";


export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const memberDoc = await db.collection("members").doc(params.id).get();
  
  if (!memberDoc.exists) return notFound();
  
  const member = { id: memberDoc.id, ...memberDoc.data() } as any;

  // Linked User lookup
  const linkedUserSnapshot = await db.collection("users").where("memberId", "==", params.id).limit(1).get();
  const linkedUser = linkedUserSnapshot.empty ? null : { id: linkedUserSnapshot.docs[0].id, ...linkedUserSnapshot.docs[0].data() };
  member.linkedUser = linkedUser;

  // History fetch from sub-collection
  const historySnapshot = await memberDoc.ref.collection("history").orderBy("timestamp", "desc").limit(20).get();
  member.history = historySnapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data(),
    createdAt: doc.data().timestamp?.toDate() || new Date()
  }));

  if (!member) return notFound();

  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = (session as any)?.user as AuthUser | undefined;

  // Mask ranks for guilds the user is not part of
  const maskedGuilds = (member.guilds || []).map((mg: any) => ({
    ...mg,
    rank: canSeeRank(user, mg as any) ? mg.rank : ""
  }));

  const memberGuildIds = (member.guilds || []).map((g: any) => g.id);

  const guildsSnap = await db.collection("guilds").get();
  const guildByTag = new Map(guildsSnap.docs.map(doc => [doc.data().tag, { id: doc.id, ...doc.data() }]));

  // Filter out rank changes user doesn't have permission to see
  const maskedHistory = (member.history || []).filter((item: any) => {
    const eventType = item.eventType || item.type;
    if (eventType === "RANK_CHANGE") {
      // RANK_CHANGE values are formatted as "Rank (TAG)"
      // We try to extract the TAG and check permissions
      const tagMatch = item.newValue?.match(/\(([^)]+)\)/) || item.oldValue?.match(/\(([^)]+)\)/);
      if (tagMatch) {
         const tag = tagMatch[1];
         const guild = guildByTag.get(tag) || (member.guilds || []).find((mg: any) => mg.tag === tag);
         if (guild && !canSeeRank(user, guild as any)) {
           return false;
         }
      }
    }
    return true;
  });

  const sanitizedMember = sanitizeData(member);
  const sanitizedHistory = sanitizeData(maskedHistory);
  const sanitizedGuilds = sanitizeData(maskedGuilds);

  const settingsSnapshot = await db.collection("settings").doc("system").get();
  const settings = settingsSnapshot.exists ? settingsSnapshot.data() : null;
  const editableAllianceRanks = settings?.editableAllianceRanks || [];

  const allianceGuildSnap = await db.collection("guilds").where("isAllianceGuild", "==", true).get();
  const allianceGuildIds = allianceGuildSnap.docs.map((d) => d.id);
  const allianceMembership = (member.guilds || []).find((g: any) => allianceGuildIds.includes(g.id));
  const allianceRank = allianceMembership ? allianceMembership.rank : null;

  // --- Visibility Check ---
  // If not alliance member, only Admin or their Guild Leader can see the profile
  if (!member.isAllianceMember) {
    if (user?.role === "ADMIN" || user?.role === "ALLIANCE_LEADER") {
      // Allowed
    } else if (user?.role === "GUILD_LEADER" && canEditMember(user, memberGuildIds, member.isAllianceMember, member.leftAt, member.pastGuildIds, member.wasAllianceMember, allianceRank, editableAllianceRanks)) {
      // Allowed
    } else {
      // Restricted
      return notFound();
    }
  }

  const manualRolesSnapshot = await db.collection("roles").orderBy("name", "asc").get();
  const manualRoles = manualRolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const manualGuildsSnapshot = await db.collection("guilds").where("isManual", "==", true).get();
  const manualGuilds = manualGuildsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  let discordRoles: any[] = [];
  if (member.linkedUser?.discordId) {
    discordRoles = await getUserDiscordRoles(member.linkedUser.discordId);
  }

  const sanitizedRoles = sanitizeData(discordRoles);
  const sanitizedManualRoles = sanitizeData(manualRoles);
  const sanitizedManualGuilds = sanitizeData(manualGuilds);

  const isMe = user?.id && user.id === member.linkedUser?.id;
  const hasEditPerms = canEditMember(user, memberGuildIds, member.isAllianceMember, member.leftAt, member.pastGuildIds, member.wasAllianceMember, allianceRank, editableAllianceRanks);
  const effectiveDiscordName = member.customDiscordName || member.linkedUser?.name || null;

  return (
    <MemberDetailClient
      sanitizedMember={sanitizedMember}
      sanitizedGuilds={sanitizedGuilds}
      sanitizedHistory={sanitizedHistory}
      sanitizedRoles={sanitizedRoles}
      sanitizedManualRoles={sanitizedManualRoles}
      sanitizedManualGuilds={sanitizedManualGuilds}
      effectiveDiscordName={effectiveDiscordName}
      isMe={isMe}
      hasEditPerms={hasEditPerms}
      canEditComments={canEditMember(user, memberGuildIds, member.isAllianceMember, member.leftAt, member.pastGuildIds, member.wasAllianceMember, allianceRank, editableAllianceRanks)}
    />
  );
}
