import LoginClient from "./LoginClient";

// Check on server side whether OAuth secrets are configured
export default function LoginPage() {
  const discordConfigured = !!(
    process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
  );
  const googleConfigured = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return (
    <LoginClient
      discordConfigured={discordConfigured}
      googleConfigured={googleConfigured}
    />
  );
}
