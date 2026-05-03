import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/firebase-admin";

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
        const userSnapshot = await db.collection("users").where("email", "==", credentials.email).limit(1).get();
        
        if (userSnapshot.empty) return null;
        
        const userDoc = userSnapshot.docs[0];
        const user = userDoc.data();
        
        // In local development we compare directly; in production use bcrypt.compare
        if (user && user.passwordHash === credentials.password) {
          return { 
            id: userDoc.id, 
            email: user.email, 
            name: user.name,
            role: user.role 
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

        const userSnapshot = await db.collection("users").where("email", "==", email).limit(1).get();
        
        if (userSnapshot.empty) {
          await db.collection("users").add({
            email,
            name: user.name || (profile as any).name || (profile as any).username,
            image: user.image || (profile as any).image_url || (profile as any).picture,
            discordId: account.provider === "discord" ? user.id : null,
            role: "WEB_MEMBER",
            createdAt: new Date()
          });
        } else {
          // Update existing user with OAuth info if needed
          const userDoc = userSnapshot.docs[0];
          await userDoc.ref.update({
            discordId: account.provider === "discord" ? user.id : (userDoc.data().discordId || null),
            lastLoginAt: new Date(),
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }: any) {
      if (user || token.email) {
        const email = user?.email || token.email;
        const userSnapshot = await db.collection("users").where("email", "==", email).limit(1).get();

        if (userSnapshot.empty) {
          if (token.email) return { deleted: true };
          return token;
        }

        const userDoc = userSnapshot.docs[0];
        const userInDb = userDoc.data();

        token.id = userDoc.id;
        token.role = userInDb.role;

        // Fetch member data for guild info if linked
        let allMemberGuilds: any[] = [];
        if (userInDb.memberId) {
          const memberDoc = await db.collection("members").doc(userInDb.memberId).get();
          if (memberDoc.exists) {
            allMemberGuilds = memberDoc.data()?.guilds || [];
          }
        }

        // Determine "Primary" Guild ID (Alliance preferred)
        const allianceMembership = allMemberGuilds.find(mg => mg.isAllianceGuild);
        token.guildId = allianceMembership?.id || allMemberGuilds[0]?.id || null;
        
        let managedIds = userInDb.managedGuildIds || [];
        // If they have no explicit managed guilds, populate from their own memberships
        if (managedIds.length === 0) {
          managedIds = allMemberGuilds.map(mg => mg.id);
        }
        token.subGuildIds = managedIds;
        token.memberGuildIds = allMemberGuilds.map(mg => mg.id);
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
        session.user.memberGuildIds = token.memberGuildIds || [];
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
