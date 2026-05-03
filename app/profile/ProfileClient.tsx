"use client";
import { useState } from "react";
import { verifyAndLinkApiKey, unlinkAccount, changePassword, deleteMyAccount } from "./actions";
import { signOut } from "next-auth/react";

export default function ProfileClient({ isLinked, userRole }: { isLinked: boolean, userRole?: string }) {
  const [apiKey, setApiKey] = useState("");
  const [msg, setMsg] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingNewPassword, setPendingNewPassword] = useState("");
  const [confirmUsername, setConfirmUsername] = useState("");
  const [confirmOldPassword, setConfirmOldPassword] = useState("");

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

      {/* Security Settings */}
      <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginTop: '2rem' }}>
        <h2>Sicherheit</h2>
        
        <div style={{ marginTop: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3>Passwort ändern</h3>
          <button 
            onClick={() => setShowPasswordModal(true)}
            style={{ padding: '0.6rem 1rem', background: 'var(--accent-color)', color: 'black', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '4px', marginTop: '0.5rem' }}
          >
            Passwort ändern
          </button>

          {showPasswordModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
              display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
              <div style={{
                background: '#1a1a1a', padding: '2rem', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)', maxWidth: '400px', width: '100%'
              }}>
                <h3 style={{ marginTop: 0 }}>Passwortänderung bestätigen</h3>
                <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Bitte bestätige die Änderung mit deinem aktuellen Benutzernamen oder deiner E-Mail und deinem Passwort.
                </p>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setMsg("Ändere Passwort...");
                  setShowPasswordModal(false);
                  const res = await changePassword(confirmUsername, confirmOldPassword, pendingNewPassword);
                  if (res?.success) {
                    setMsg("✅ Passwort erfolgreich geändert.");
                    setConfirmUsername("");
                    setConfirmOldPassword("");
                    setPendingNewPassword("");
                    // Reset the main form input as well if needed
                  } else {
                    setMsg("❌ Fehler: " + (res?.error || "Unbekannt"));
                  }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="Benutzername / E-Mail"
                    value={confirmUsername}
                    onChange={e => setConfirmUsername(e.target.value)}
                    style={{ padding: '0.6rem', border: '1px solid rgba(255,255,255,0.2)', background: '#222', color: 'white', borderRadius: '4px' }}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Aktuelles Passwort"
                    value={confirmOldPassword}
                    onChange={e => setConfirmOldPassword(e.target.value)}
                    style={{ padding: '0.6rem', border: '1px solid rgba(255,255,255,0.2)', background: '#222', color: 'white', borderRadius: '4px' }}
                  />
                  <input
                    type="password"
                    required
                    minLength={4}
                    placeholder="Neues Passwort"
                    value={pendingNewPassword}
                    onChange={e => setPendingNewPassword(e.target.value)}
                    style={{ padding: '0.6rem', border: '1px solid rgba(255,255,255,0.2)', background: '#222', color: 'white', borderRadius: '4px' }}
                  />
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setShowPasswordModal(false)} style={{ flex: 1, padding: '0.6rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                      Abbrechen
                    </button>
                    <button type="submit" style={{ flex: 1, padding: '0.6rem', background: 'var(--accent-color)', color: 'black', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                      Bestätigen
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <h3>Account löschen</h3>
          <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1rem' }}>
            Achtung: Dies löscht deinen Web-Account permanent. Dein GW2-Charakter bleibt in der Allianz erhalten, 
            kann aber erst nach Neuregistrierung wieder verwaltet werden.
          </p>
          {userRole === "ADMIN" ? (
            <div style={{ padding: '0.8rem', background: 'rgba(231,76,60,0.15)', borderLeft: '4px solid #e74c3c', borderRadius: '4px', color: '#e74c3c', fontSize: '0.9rem' }}>
              <strong>Sperre aktiv:</strong> Administratoren können sich nicht selbst löschen. Dies muss durch einen anderen Administrator im Admin Panel erfolgen.
            </div>
          ) : (
            <button onClick={async () => {
              if (!confirm("Möchten Sie Ihren gesamten Account WIRKLICH löschen? Dies kann nicht rückgängig gemacht werden!")) return;
              setMsg("Lösche Account...");
              await deleteMyAccount();
              signOut({ callbackUrl: '/' });
            }} style={{ padding: '0.6rem 1rem', background: 'var(--danger-color, #e74c3c)', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
              Account permanent löschen
            </button>
          )}
        </div>
      </div>

      {msg && <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', borderLeft: '4px solid var(--accent-color)' }}>{msg}</div>}
    </div>
  );
}
