"use server";
import { prisma } from "@/lib/prisma";
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
  const session = (await getServerSession(authOptions)) as { user: AuthUser } | null;
  if (!session?.user?.id) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { memberId: null }
  });
}

export async function changePassword(currentUsername: string, currentPassword: string, newPassword: string) {
  const session = (await getServerSession(authOptions)) as { user: AuthUser } | null;
  if (!session?.user?.id) return { success: false, error: "Not logged in" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  
  if (!user || user.name !== currentUsername || user.passwordHash !== currentPassword) {
    return { success: false, error: "Aktueller Benutzername oder Passwort ist falsch." };
  }

  if (newPassword.length < 4) {
    return { success: false, error: "Das neue Passwort muss mindestens 4 Zeichen lang sein." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newPassword }
  });

  return { success: true };
}

export async function deleteMyAccount() {
  const session = (await getServerSession(authOptions)) as { user: AuthUser } | null;
  if (!session?.user?.id) return { success: false, error: "Not logged in" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role === "ADMIN") {
    return { success: false, error: "Administratoren können sich nicht selbst löschen." };
  }

  await prisma.user.delete({
    where: { id: session.user.id }
  });

  return { success: true };
}
