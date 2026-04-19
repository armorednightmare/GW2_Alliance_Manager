# Automatisierte Backups mit Google Drive (OAuth2)

Da Google standardmäßig keinen Speicherplatz ("Quota") mehr für automatische Dienstkonten (Service Accounts) anbietet, nutzt der Alliance Manager die offiziellen **OAuth 2.0 Credentials**, um Backups direkt in dein existierendes Google Drive (unter deinem Benutzerkonto und Speicher) hochzuladen.

## Voraussetzungen
Du hast bereits ein Google Cloud Projekt erstellt und die **Google Drive API** aktiviert, sowie OAuth 2.0 Credentials (Client ID & Client Secret) erstellt.
*(Diese Credentials hast du vermutlich ohnehin schon für den NextAuth Google-Login im Projekt)*.

Falls nicht:
1. Gehe zur [Google Cloud Console](https://console.cloud.google.com/).
2. Aktiviere die `Google Drive API`.
3. Gehe zu **APIs & Dienste > Anmeldedaten** und öffne deine **OAuth-Client-ID** (oder erstelle eine neue vom Typ: Webanwendung).
4. Füge unter **"Autorisierte Weiterleitungs-URIs"** zwingend diesen Link hinzu: `https://developers.google.com/oauthplayground` (und speichere).
5. **WICHTIG:** Gehe im Menü auf **"OAuth-Zustimmungsbildschirm"** (OAuth consent screen). Da dein Projekt vermutlich auf "In der Testphase" (Testing) steht, scrolle runter zu **"Testnutzer" (Test users)** und drücke auf "Add Users". Füge dort deine **eigene** Google-E-Mail-Adresse hinzu. Ohne diesen Schritt erhältst du beim Login `Fehler 403: access_denied`.

## Schritt 1: Refresh Token generieren

Damit der Bot auch nachts Hintergrund-Backups auf dein Drive laden kann, ohne dass du live im Browser auf "Zulassen" klicken musst, benötigen wir einen dauerhaften **Refresh Token**.

Wir nutzen Googles offiziellen "OAuth 2.0 Playground" dafür:
1. Öffne den **[Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)**.
2. Klicke **oben rechts auf das kleine Zahnrad** (OAuth 2.0 configuration).
3. Setze einen Haken bei **"Use your own OAuth credentials"**.
4. Trage in die freigewordenen Felder deine `Client ID` und `Client secret` aus der Google Cloud Console ein. Klicke auf "Close".
5. Suche im linken Menü nach **Drive API v3**.
6. Klappe es aus und wähle die Berechtigung: `https://www.googleapis.com/auth/drive`
7. Klicke auf den blauen Button **"Authorize APIs"**.
8. Wähle deinen Google-Account aus, drücke auf Weiter und erlaube den Zugriff.
9. Im nächsten Panel auf der linken Seite (Step 2) siehst du einen "Authorization code". Klicke auf den blauen Button **"Exchange authorization code for tokens"**.
10. Nun taucht weiter unten ein **`Refresh token`** auf (ein langer Textblock, beginnend zumeist mit `1//...`). Kopiere diesen Text exakt.

## Schritt 2: Umgebungsvariablen eintragen

Öffne deine `.env` Datei im Projekt. Stelle sicher, dass die Google-Client Daten UND der neue Refresh-Token eingetragen sind:

```env
GOOGLE_CLIENT_ID="deine-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="dein-client-secret"
GOOGLE_REFRESH_TOKEN="1//dein-kopierter-refresh-token..."

# (Optional) Falls die Backups in einen bestimmten Ordner sollen
GOOGLE_DRIVE_FOLDER_ID=""
MAX_BACKUPS="4"

# Erforderlich für die Verschlüsselung in der Datenbank
# Generiere einen Key mit:
# Windows (PowerShell): [Convert]::ToBase64String((1..32 | % { Get-Random -Min 0 -Max 256 }))
# Linux/Mac (Bash): openssl rand -base64 32
BACKUP_ENCRYPTION_KEY="dein-sicherer-key"
```

## Schritt 3: Sicherheit (Verschlüsselung)

Der Alliance Manager speichert den Refresh-Token in der Datenbank verschlüsselt (AES-256-GCM). Dafür **muss** die Variable `BACKUP_ENCRYPTION_KEY` in deiner `.env` gesetzt sein. Falls du diese änderst, musst du den Login im Admin-Panel erneut durchführen.

## Schritt 4: Container Neustart

Damit der Backup-Worker den Token aufgreift, musst du deinen Servercontainer neu starten:

```bash
docker-compose up -d web
```

🎉 Fertig! Über die UI im **Admin Panel** kannst du nun bequem den wöchentlichen/täglichen Backup-Zeitplan aktivieren!
