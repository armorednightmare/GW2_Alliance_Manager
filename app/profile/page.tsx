export const dynamic = 'force-dynamic';
import { db } from "@/lib/firebase-admin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ProfileClient from "./ProfileClient";
import ProfileViewClient from "./ProfileViewClient";
import { redirect } from "next/navigation";
import { sanitizeData } from "@/lib/utils";
import "../members/Members.css";

interface UserSession {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
    id: string;
    subGuildIds?: string[];
  };
}

export default async function ProfilePage() {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session) redirect("/login");

  const userDoc = await db.collection("users").doc(session.user.id).get();
  if (!userDoc.exists) return <div>Nutzer nicht gefunden.</div>;
  const user = { id: userDoc.id, ...userDoc.data() } as any;

  let member = null;
  if (user.memberId) {
    const memberDoc = await db.collection("members").doc(user.memberId).get();
    if (memberDoc.exists) {
      member = { id: memberDoc.id, ...memberDoc.data() } as any;
      
      // Fetch history from sub-collection
      const historySnapshot = await memberDoc.ref.collection("history")
        .orderBy("timestamp", "desc")
        .limit(10)
        .get();
      
      member.history = historySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp,
          createdAt: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString()
        };
      });
    }
  }

  const sanitizedMember = sanitizeData(member);
  const sanitizedUser = sanitizeData(user);

  return <ProfileViewClient sanitizedUser={sanitizedUser} sanitizedMember={sanitizedMember} />;
}
