import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions) as any;
  if (!session || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return new NextResponse("Missing Code", { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  const protocol = req.nextUrl.protocol;
  const host = req.headers.get("host");
  const redirectUri = `${protocol}//${host}/api/admin/backup/callback`;

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.refresh_token) {
      console.error("No refresh token received. User might need to re-consent.");
    }

    // Get user email for info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    // Encrypt and save
    const encryptedToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    const settings = await prisma.systemSettings.findFirst();
    if (settings) {
      await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          backupRefreshToken: encryptedToken || settings.backupRefreshToken,
          backupEmail: email || settings.backupEmail,
        }
      });
    } else {
      await prisma.systemSettings.create({
        data: {
          allianceName: "Alliance",
          backupRefreshToken: encryptedToken,
          backupEmail: email,
        }
      });
    }

    // Redirect to Admin Panel (use req.url to ensure we use the same host as the request)
    const adminUrl = new URL('/admin', req.url);
    return NextResponse.redirect(adminUrl);

  } catch (e: any) {
    console.error("OAuth Callback Error:", e.message);
    return new NextResponse(`Authentication failed: ${e.message}`, { status: 500 });
  }
}
