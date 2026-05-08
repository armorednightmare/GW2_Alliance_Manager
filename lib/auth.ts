import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/firebase-admin";
import bcrypt from "bcryptjs";

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
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Search by name OR email in Firestore
        let userDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

        const byName = await db.collection("users").where("name", "==", credentials.username).limit(1).get();
        if (!byName.empty) {
          userDoc = byName.docs[0];
        } else {
          const byEmail = await db.collection("users").where("email", "==", credentials.username).limit(1).get();
          if (!byEmail.empty) {
            userDoc = byEmail.docs[0];
          }
        }

        if (!userDoc) return null;
        const user = userDoc.data();

        // --- Phase 4: Brute-force lockout check ---
        if (user.lockoutUntil) {
          const lockoutTime = user.lockoutUntil.toDate ? user.lockoutUntil.toDate() : new Date(user.lockoutUntil);
          if (new Date() < lockoutTime) {
            // Still locked out
            return null;
          }
          // Lockout expired — reset counters
          await userDoc.ref.update({ failedLoginAttempts: 0, lockoutUntil: null });
        }

        // --- Phase 2: Seamless bcrypt migration ---
        const storedPassword = user.passwordHash;
        if (!storedPassword) return null;

        const isBcryptHash = typeof storedPassword === "string" && storedPassword.startsWith("$2");
        let passwordValid = false;

        if (isBcryptHash) {
          // Already migrated — use bcrypt compare
          passwordValid = await bcrypt.compare(credentials.password, storedPassword);
        } else {
          // Legacy plain text — direct comparison
          passwordValid = (storedPassword === credentials.password);

          if (passwordValid) {
            // Silently upgrade to bcrypt hash
            const hash = await bcrypt.hash(credentials.password, 10);
            await userDoc.ref.update({ passwordHash: hash });
          }
        }

        if (!passwordValid) {
          // --- Phase 4: Increment failed attempts ---
          const attempts = (user.failedLoginAttempts || 0) + 1;
          const updateData: any = { failedLoginAttempts: attempts };

          if (attempts >= 5) {
            // Lock account for 15 minutes
            updateData.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
          }

          await userDoc.ref.update(updateData);
          return null;
        }

        // Successful login — reset failed attempts
        if (user.failedLoginAttempts > 0) {
          await userDoc.ref.update({ failedLoginAttempts: 0, lockoutUntil: null });
        }

        return { 
          id: userDoc.id, 
          email: user.email, 
          name: user.name,
          role: user.role 
        };
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
            role: "NEW_USER",
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
      let userDoc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot | null = null;

      if (token.id) {
        // Returning user — look up by stored Firestore doc ID
        const doc = await db.collection("users").doc(token.id as string).get();
        if (doc.exists) userDoc = doc;
      } else if (user) {
        // First sign-in — try email first (OAuth), then by id (credentials)
        if (user.email) {
          const snap = await db.collection("users").where("email", "==", user.email).limit(1).get();
          if (!snap.empty) userDoc = snap.docs[0];
        }
        if (!userDoc && user.id) {
          const doc = await db.collection("users").doc(user.id).get();
          if (doc.exists) userDoc = doc;
        }
      }

      if (!userDoc || !userDoc.exists) {
        if (token.id) return { deleted: true };
        return token;
      }

      const userInDb = userDoc.data()!;

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
