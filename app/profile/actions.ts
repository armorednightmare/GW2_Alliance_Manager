"use server";
import { db } from "@/lib/firebase-admin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthUser } from "@/lib/permissions";

export async function verifyAndLinkApiKey(apiKey: string) {
  const session = (await getServerSession(authOptions)) as { user: AuthUser } | null;
  if (!session?.user?.id) return { success: false, error: "Not logged in" };

  try {
    const res = await fetch(`https://api.guildwars2.com/v2/account?access_token=${apiKey}`);
    if (!res.ok) return { success: false, error: "Ungültiger API Key" };

    const data = await res.json();
    const accountName = data.name; // e.g. Name.1234

    // Find the member record
    const memberSnapshot = await db.collection("members").where("accountName", "==", accountName).limit(1).get();
    
    if (memberSnapshot.empty) {
      return { success: false, error: `Account ${accountName} existiert nicht in einer verknüpften Gilde. (Noch nicht gesynct?)` };
    }

    const member = memberSnapshot.docs[0];

    // Link it
    await db.collection("users").doc(session.user.id).update({
      memberId: member.id
    });

    return { success: true, accountName };
  } catch(e: any) {
    return { success: false, error: "Netzwerkfehler" };
  }
}

export async function unlinkAccount() {
  const session = (await getServerSession(authOptions)) as { user: AuthUser } | null;
  if (!session?.user?.id) return;

  await db.collection("users").doc(session.user.id).update({
    memberId: null
  });
}
