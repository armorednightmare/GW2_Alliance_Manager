"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import "./Login.css";

// Props passed from the server component wrapper
interface LoginPageProps {
  discordConfigured: boolean;
  googleConfigured: boolean;
}

export default function LoginClient({ discordConfigured, googleConfigured }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { username, password, callbackUrl: "/", redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Benutzername/E-Mail oder Passwort falsch.");
    } else {
      window.location.href = "/";
    }
  };

  const oauthAvailable = discordConfigured || googleConfigured;

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Login</h1>

        <form onSubmit={handleCredentialsLogin} className="login-form">
          <input
            type="text"
            placeholder="Benutzername / E-Mail"
            value={username}
            onChange={(e: any) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            required
          />
          {error && <p style={{ color: "#e74c3c", margin: "0.25rem 0", fontSize: "0.9rem" }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Wird eingeloggt…" : "Einloggen"}
          </button>
        </form>

        {oauthAvailable && (
          <>
            <div className="divider">Oder</div>
            <div className="oauth-buttons">
              {discordConfigured && (
                <button onClick={() => signIn("discord", { callbackUrl: "/" })} className="btn-discord">
                  🎮 Mit Discord einloggen
                </button>
              )}
              {googleConfigured && (
                <button onClick={() => signIn("google", { callbackUrl: "/" })} className="btn-google">
                  🔵 Mit Google einloggen
                </button>
              )}
            </div>
          </>
        )}

        {!oauthAvailable && (
          <div style={{
            marginTop: "1.5rem",
            padding: "1rem",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "0.85rem",
            opacity: 0.8,
            lineHeight: 1.6
          }}>
            ℹ️ <strong>OAuth nicht konfiguriert.</strong> Um Discord/Google-Login zu aktivieren,
            trage die entsprechenden Credentials in die <code>.env</code> Datei ein:
            <pre style={{ marginTop: "0.5rem", fontSize: "0.8rem", opacity: 0.7 }}>
              {`DISCORD_CLIENT_ID=...\nDISCORD_CLIENT_SECRET=...\nGOOGLE_CLIENT_ID=...\nGOOGLE_CLIENT_SECRET=...`}
            </pre>
            Danach <code>docker-compose restart web</code> ausführen.
          </div>
        )}
      </div>
    </div>
  );
}
