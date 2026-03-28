"use client";
import { useState } from "react";
import { verifyAndLinkApiKey, unlinkAccount } from "./actions";

export default function ProfileClient({ isLinked }: { isLinked: boolean }) {
  const [apiKey, setApiKey] = useState("");
  const [msg, setMsg] = useState("");

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("Prüfe API Key...");
    const res = await verifyAndLinkApiKey(apiKey);
    if (res.success) {
      setMsg("✅ Erfolgreich verknüpft mit " + res.accountName + ". Bitte Seite neu laden.");
      setApiKey("");
      window.location.reload();
    } else {
      setMsg("❌ Fehler: " + (res.error || "Unbekannt"));
    }
  };

  const handleUnlink = async () => {
    if (!confirm("Möchten Sie die Verknüpfung wirklich löschen?")) return;
    setMsg("Trennung läuft...");
    await unlinkAccount();
    setMsg("Account-Verknüpfung wurde erfolgreich getrennt.");
    window.location.reload();
  };

  return (
    <div className="profile-container" style={{ marginTop: '2rem' }}>
      {!isLinked ? (
        <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <h2>GW2 Account Verknüpfen</h2>
          <p>Um Ihre Rechte in der Allianz korrekt abbilden zu können, benötigen wir einen GW2 API Key (Benötigte Berechtigung: <strong>account</strong>).</p>
          
          <form onSubmit={handleLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', marginTop: '1rem' }}>
            <input 
              type="text" 
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX..." 
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              style={{ padding: '0.8rem', border: '1px solid rgba(255,255,255,0.2)', background: '#1a1a1a', color: 'white', borderRadius: '4px' }}
            />
            <button type="submit" style={{ padding: '0.8rem', background: 'var(--accent-color)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
              API Key verifizieren & verknüpfen
            </button>
          </form>
        </div>
      ) : (
        <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <h2>Verknüpfung aufheben</h2>
          <p>Falls Sie den falschen Account verknüpft haben, können Sie die Verbindung hier jederzeit serverseitig trennen.</p>
          <button onClick={handleUnlink} style={{ padding: '0.8rem', background: 'var(--danger-color, #e74c3c)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', marginTop: '1rem' }}>
            Account-Verknüpfung trennen
          </button>
        </div>
      )}

      {msg && <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', borderLeft: '4px solid var(--accent-color)' }}>{msg}</div>}
    </div>
  );
}
