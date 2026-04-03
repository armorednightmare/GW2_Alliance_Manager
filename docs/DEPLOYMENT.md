# Deployment Guide: Railway (Hosting & Konfiguration)

Dieser Guide erklärt Schritt für Schritt, wie Sie den **GW2 Alliance Manager** auf [Railway](https://railway.app/) hosten und konfigurieren. Wir nutzen hierfür ein optimiertes **Dockerfile**, um maximale Stabilität zu gewährleisten.

## 📋 Voraussetzungen

- Ein **Railway-Account**.
- Das Repository auf Ihrem **GitHub-Account**.
- Ein GW2 API-Key für die Initialisierung der Allianz.

---

## 🚀 Schritt 1: Datenbank (PostgreSQL) erstellen

1. Loggen Sie sich bei Railway ein und erstellen Sie ein **New Project**.
2. Wählen Sie **Provision PostgreSQL** aus.
3. Railway erstellt nun eine leere PostgreSQL-Instanz.

## 🔑 Schritt 2: Anwendung (GitHub Repo) hinzufügen

1. Klicken Sie auf **+ New** -> **GitHub Repo**.
2. Wählen Sie Ihr Repository `gw2-alliance-manager` aus.
3. Railway erkennt nun automatisch das **Dockerfile** im Root-Verzeichnis.

## ⚙️ Schritt 3: Umgebungsvariablen (Variables) konfigurieren

Gehen Sie in den **Variables**-Tab Ihres Web-Services auf Railway und fügen Sie folgende Variablen hinzu:

### 📡 System & Netzwerke
- `DATABASE_URL`: Klicken Sie auf **Add Variable** -> **Reference Service Variable** und wählen Sie die Variable der PostgreSQL-Datenbank aus (meist `TCP_URL`).
- `NEXTAUTH_URL`: Die URL Ihrer Railway-App (z. B. `https://gw2-alliance-manager-production.up.railway.app`).
- `NEXTAUTH_SECRET`: Ein zufälliger, geheimer String (z. B. generiert mit `openssl rand -base64 32`).

### 🔑 OAuth (Optional, für Discord/Google Login)
- `DISCORD_CLIENT_ID`: (Vom Discord Developer Portal)
- `DISCORD_CLIENT_SECRET`: (Vom Discord Developer Portal)
- `GOOGLE_CLIENT_ID`: (Von Google Cloud Console)
- `GOOGLE_CLIENT_SECRET`: (Von Google Cloud Console)

---

## 🛠️ Schritt 4: Build & Deployment

Da wir das im Repository enthaltene **Dockerfile** nutzen, kümmert sich Railway um fast alles:

1. **Build Process**: Railway erkennt das `Dockerfile`, installiert die Abhängigkeiten, generiert den Prisma-Client und baut die Next.js App (`next build`).
2. **Start Process**: Nach dem Build führt der Container automatisch folgende Befehle aus:
   - `npx prisma migrate deploy`: Aktualisiert das Datenbank-Schema.
   - `(npx tsx cron.ts &)`: Startet den automatischen Roster-Sync im Hintergrund.
   - `node server.js`: Startet die Web-Anwendung (optimiert).

> [!IMPORTANT]
> Sollte der Build fehlschlagen, stellen Sie sicher, dass in den Railway-Settings **Docker** als Build-Typ ausgewählt ist und nicht Nixpacks (Standard).

---

## ⏰ Schritt 5: Automatischer Sync (Cron)

Die Anwendung nutzt eine `cron.ts` Datei, um die Gilden-Roster regelmäßig zu synchronisieren.

- Durch die Konfiguration im `Dockerfile` startet dieser Prozess automatisch im Hintergrund der Web-App.
- **Wichtig**: Railway Services "schlafen" manchmal (im Free Tier), wenn sie nicht genutzt werden. Der Hintergrundprozess stoppt dann ebenfalls. Für kritische Anwendungen empfiehlt sich ein dauerhafter Service ("Always On").

---

## ✅ Überprüfung

Wenn alles fertig ist:
1. Öffnen Sie die URL Ihrer Anwendung.
2. Der erste registrierte Nutzer sollte in der PostgreSQL-Datenbank (via Railway Data-Tab) als `ADMIN` gesetzt werden.

> [!CAUTION]
> Geben Sie niemals Ihre `DATABASE_URL` oder `NEXTAUTH_SECRET` an Dritte weiter!
