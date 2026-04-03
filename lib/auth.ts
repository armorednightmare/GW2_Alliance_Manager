import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Local Account",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        // In local development we compare directly; in production use bcrypt.compare
        if (user && user.passwordHash === credentials.password) {
          return { 
            id: user.id, 
            email: user.email, 
            name: user.name,
            role: user.role // Added role to satisfy User interface
          };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (account.provider === "discord" || account.provider === "google") {
        const email = user.email || (profile as any).email;
        if (!email) return false;

        let userInDb = await prisma.user.findUnique({ where: { email } });
        if (!userInDb) {
          userInDb = await prisma.user.create({
            data: {
              email,
              name: user.name || (profile as any).name || (profile as any).username,
              image: user.image || (profile as any).image_url || (profile as any).picture,
              discordId: account.provider === "discord" ? user.id : null,
              role: "WEB_MEMBER"
            }
          });
        } else {
          // Update existing user with OAuth info if needed
          await prisma.user.update({
            where: { id: userInDb.id },
            data: {
              discordId: account.provider === "discord" ? user.id : userInDb.discordId,
              lastLoginAt: new Date(),
            }
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }: any) {
      if (user) {
        // Initial login
        const userInDb = await prisma.user.findUnique({ 
          where: { email: user.email },
          include: { 
            member: true,
            managedGuilds: { select: { id: true } }
          }
        });
        if (userInDb) {
          token.id = userInDb.id;
          token.role = userInDb.role;
          token.guildId = userInDb.member?.guildId || null;
          
          const managedIds = userInDb.managedGuilds.map(g => g.id);
          // If they have no explicit guilds, fallback to automated union
          if (managedIds.length === 0 && userInDb.member?.subGuildId) {
            managedIds.push(userInDb.member.subGuildId);
          }
          token.subGuildIds = managedIds;
        }
      } else if (token.email) {
        // Subsequent request verification: Ensure user still exists in database
        const userInDb = await prisma.user.findUnique({ 
          where: { email: token.email },
          include: { 
            member: true,
            managedGuilds: { select: { id: true } }
          }
        });
        if (!userInDb) {
          return { deleted: true };
        }
        // Sync role and guildId in case admin changed it
        token.id = userInDb.id;
        token.role = userInDb.role;
        token.guildId = userInDb.member?.guildId || null;
        
        const managedIds = userInDb.managedGuilds.map(g => g.id);
        if (managedIds.length === 0 && userInDb.member?.subGuildId) {
            managedIds.push(userInDb.member.subGuildId);
        }
        token.subGuildIds = managedIds;
      }

      return token;
    },
    async session({ session, token }: any) {
      if (token.deleted) {
        return null;
      }
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.guildId = token.guildId;
        session.user.subGuildIds = token.subGuildIds || [];
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "change-me-next-auth-secret-123",
};
