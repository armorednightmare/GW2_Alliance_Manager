"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

export async function verifyAndLinkApiKey(apiKey: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Not logged in" };

  try {
    const res = await fetch(`https://api.guildwars2.com/v2/account?access_token=${apiKey}`);
    if (!res.ok) return { success: false, error: "Ungültiger API Key" };

    const data = await res.json();
    const accountName = data.name; // e.g. Name.1234

    // Find the member record
    const member = await prisma.member.findUnique({
      where: { accountName: accountName }
    });

    if (!member) {
      return { success: false, error: `Account ${accountName} existiert nicht in einer verknüpften Gilde. (Noch nicht gesynct?)` };
    }

    // Link it
    await prisma.user.update({
      where: { id: session.user.id },
      data: { memberId: member.id }
    });

    return { success: true, accountName };
  } catch(e: any) {
    return { success: false, error: "Netzwerkfehler" };
  }
}

export async function unlinkAccount() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { memberId: null }
  });
}
