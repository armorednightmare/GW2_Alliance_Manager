export interface DiscordRole {
  id: string;
  name: string;
  color: number;
}

export async function getUserDiscordRoles(discordId: string): Promise<DiscordRole[]> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  // Wenn keine Konfiguration vorliegt, direkt abbrechen
  if (!guildId || !botToken) return [];

  try {
    // 1. Hole alle Rollen des Servers (um ID -> Name Mapping zu bekommen)
    // In Produktion könnte das gecacht werden
    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
      next: { revalidate: 300 } // NextJS Fetch Cache für 5 Minuten
    });
    
    if (!rolesRes.ok) return [];
    const allRoles: DiscordRole[] = await rolesRes.json();
    const roleMap = new Map<string, DiscordRole>(allRoles.map(r => [r.id, r]));

    // 2. Hole die genauen Rollen des angesprochenen Users
    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store" // immer frisch abrufen
    });

    if (!memberRes.ok) return [];
    const memberData = await memberRes.json();
    const userRoleIds: string[] = memberData.roles || [];

    // 3. Werte auflösen und uninteressante Rollen (z.B. @everyone) filtern
    return userRoleIds
      .map(id => roleMap.get(id))
      .filter((r): r is DiscordRole => Boolean(r));

  } catch (err) {
    console.error("Fehler beim Abruf der Discord-Rollen:", err);
    return [];
  }
}
