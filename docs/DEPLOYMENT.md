# Deployment Guide: Firebase App Hosting & Cloud Scheduler

Dieser Guide erklärt Schritt für Schritt, wie Sie den **GW2 Alliance Manager** in der Google Cloud über **Firebase App Hosting** bereitstellen und die automatische Hintergrund-Synchronisation einrichten.

## 📋 Voraussetzungen

- Ein **Google Cloud / Firebase Account**.
- Das Repository auf Ihrem **GitHub-Account**.
- Ein GW2 API-Key für die Initialisierung der Allianz.

---

## 🚀 Schritt 1: Firebase Projekt & Datenbank

Die Einrichtung der Firebase Firestore-Datenbank sowie die lokale Emulator-Umgebung ist detailliert im [Firebase Setup Guide](FIREBASE_SETUP.md) beschrieben. Stellen Sie sicher, dass Ihre Firestore-Datenbank im "Native Mode" läuft und die Sicherheitsregeln gesetzt sind.

## 🔑 Schritt 2: Firebase App Hosting Deployment

Firebase App Hosting ist die offizielle, serverlose Hosting-Lösung für Next.js Apps in der Google Cloud.

1. Gehen Sie in der **[Firebase Console](https://console.firebase.google.com/)** zu Ihrem Projekt.
2. Navigieren Sie zu **App Hosting** (im linken Menü unter Build/Erstellen).
3. Klicken Sie auf **"Erste Schritte"**.
4. Verbinden Sie Ihren **GitHub Account** und wählen Sie das Repository `GW2_Alliance_Manager` aus.
5. Konfigurieren Sie den Build:
   - Root-Verzeichnis: `/` (oder leer lassen)
   - Branch: `master`
6. **Umgebungsvariablen (Secrets)**:
   Während des Setups werden Sie gefragt, ob Sie Umgebungsvariablen hinzufügen möchten. Fügen Sie hier alle wichtigen Variablen aus Ihrer `.env` hinzu (z.B. `NEXTAUTH_SECRET`, `DISCORD_CLIENT_ID`, `GOOGLE_CLIENT_ID`, etc.). Speichern Sie sensible Daten als **Secret** im Google Secret Manager.

App Hosting kümmert sich ab jetzt um den Build-Prozess (`npm run build`) und das globale Routing!

## ⏰ Schritt 3: Automatischer Sync (Cloud Scheduler)

Da Firebase App Hosting eine Serverless-Umgebung ist, laufen hier keine Hintergrund-Prozesse (wie lokale Cronjobs) dauerhaft weiter. Um die GW2-Gilden regelmäßig zu synchronisieren, nutzen wir den **Google Cloud Scheduler**.

1. Gehen Sie in der **[Google Cloud Console](https://console.cloud.google.com/)** zu Ihrem Projekt.
2. Suchen Sie nach **Cloud Scheduler** und klicken Sie auf **Job erstellen**.
3. **Konfiguration:**
   - **Name:** `gw2-alliance-sync`
   - **Region:** Wählen Sie die Region in der Nähe Ihres App Hostings (z.B. `europe-west4` oder `europe-west3`).
   - **Häufigkeit (Cron):** `*/10 * * * *` (Alle 10 Minuten)
   - **Zeitzone:** `Europe/Berlin`
4. **Ziel-Einstellungen:**
   - **Zieltyp:** `HTTP`
   - **URL:** `https://[DEINE-APP-HOSTING-URL]/api/cron/sync`
   - **HTTP-Methode:** `POST`
5. **Sicherheit (OIDC Token) - WICHTIG:**
   - Klappen Sie **Auth Header** auf.
   - Wählen Sie **OIDC-Token hinzufügen**.
   - **Dienstkonto:** Wählen Sie das Standard-Compute-Service-Account (z.B. `[PROJEKT-NUMMER]-compute@developer.gserviceaccount.com`).
   - **Zielgruppe (Audience):** Tragen Sie genau die gleiche URL wie oben ein (`https://[DEINE-APP-HOSTING-URL]/api/cron/sync`).

### Wie das Sync-Intervall in der App funktioniert
Obwohl der Cloud Scheduler **alle 10 Minuten** anklopft, bestimmen Sie im **Admin Panel** der Web-App, wie oft der Sync *wirklich* ausgeführt werden soll!
- Wenn Sie im Admin Panel z.B. **"Alle 2 Stunden"** eingestellt haben, bricht der Aufruf einfach ab (und spart Ressourcen), bis die 2 Stunden erreicht sind.
- Auch die **Automatischen Backups** (Google Drive) hängen an diesem Endpunkt. Das heißt, Sie brauchen keinen separaten Job für Backups!

---

## 🛠️ Troubleshooting

### ❌ Sync schlägt fehl (401 Unauthorized / Invalid Audience)
- **Lösung:** Stellen Sie sicher, dass in den Cloud Scheduler Einstellungen das Feld "Zielgruppe (Audience)" **exakt** mit der Aufruf-URL übereinstimmt, inklusive `https://` und dem `/api/cron/sync` Pfad. Die App prüft das Token streng auf diesen Wert.

### ❌ Fehlende Umgebungsvariablen nach Push
- **Lösung:** Wenn Sie lokal eine neue Variable (z.B. `BACKUP_ENCRYPTION_KEY`) in die `.env` eintragen, müssen Sie diese auch in der Firebase Console unter **App Hosting -> [Dein Rollout] -> Rollout-Einstellungen -> Umgebungsvariablen** eintragen. Danach muss ein neuer Rollout angestoßen werden.

---

## ✅ Überprüfung

Wenn alles fertig ist:
1. Öffnen Sie die URL Ihrer Anwendung.
2. Der erste registrierte Nutzer sollte in der Firebase Console unter `users` manuell als `ADMIN` gesetzt werden (siehe README).
3. Gehen Sie ins **Admin Panel** und konfigurieren Sie das **Sync-Intervall** und den **Backup-Plan**.
