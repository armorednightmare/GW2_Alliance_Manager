# GW2 Alliance Manager

Ein leistungsstarkes Web-Tool zur Verwaltung von Guild Wars 2 Allianzen. Behalten Sie den Überblick über Ihre Mitglieder, synchronisieren Sie Roster automatisch via API und verwalten Sie Berechtigungen für Gildenleiter und Administratoren.

## 🚀 Features

- **Automatischer Roster-Sync**: Synchronisiert Mitgliederdaten direkt von der GW2 API.
- **Rollenbasiertes Rechtesystem**: Granulare Zugriffskontrolle für Admins, Allianzleiter und Gildenleiter.
- **Multigilden-Support**: Gildenleiter können mehrere Sub-Gilden innerhalb der Allianz verwalten.
- **Aktivitäts-Historie**: Lückenlose Verfolgung von Rangänderungen, Beitritten und Austritten.
- **Anpassbares Design**: Integriertes Admin-Panel zur Gestaltung von Farben, Logos und Allianznamen.
- **Sichere Authentifizierung**: Support für Discord-Login, Google-Login und klassische E-Mail/Passwort-Konten.

## 🛠 Tech-Stack

- **Frontend/Backend**: [Next.js 14](https://nextjs.org/) (App Router)
- **Datenbank**: [Firebase Firestore](https://firebase.google.com/products/firestore) (Dokumenten-basiert)
- **Authentifizierung**: [NextAuth.js](https://next-auth.js.org/) mit Firebase-Admin
- **Lokale Entwicklung**: Docker & [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- **Produktion / Deployment**: [Firebase App Hosting](https://firebase.google.com/docs/app-hosting) (Serverless Next.js)

## 📋 Voraussetzungen

- Docker & Docker Compose installiert.
- Ein GW2 API-Key mit den Berechtigungen `account`, `wvw` und `guilds` (für Gildenleiter) bzw. nur `account` (für reguläre Mitglieder zur Profil-Verknüpfung).

## 🔧 Installation & Setup

### 1. Repository klonen
```bash
git clone https://github.com/armorednightmare/GW2_Alliance_Manager.git
cd GW2_Alliance_Manager
```

### 2. Umgebungsvariablen konfigurieren
Erstellen Sie eine `.env` Datei im Hauptverzeichnis basierend auf der Vorlage `.env.example`:

```bash
cp .env.example .env
```

### 3. Start mit Docker (Lokal)
```bash
docker-compose up -d --build
```
Die Anwendung ist nun unter `http://localhost:3001` (Web) und `http://localhost:4000` (Firebase Emulator UI) erreichbar.

### 4. Live Deployment (Firebase App Hosting)
Für die Produktion wurde das Projekt auf **Firebase App Hosting** optimiert. Pushes auf den `master`-Branch (oder konfigurierte Feature-Branches) triggern automatisch einen Cloud Build und ein Deployment.

### 5. Den ersten Admin-Nutzer erstellen
Bei einer komplett leeren Datenbank (z.B. nach dem Live-Gang) gibt es noch keinen Administrator:
1. Loggen Sie sich auf der fertigen Webseite (Lokal oder Live) mit Discord, Google oder E-Mail ein.
2. Gehen Sie in die **Firebase Console** -> **Firestore Database**.
3. Öffnen Sie die Sammlung `users` und suchen Sie Ihr soeben erstelltes Profil-Dokument.
4. Ändern Sie das Feld `role` von `"WEB_MEMBER"` zu `"ADMIN"`.
5. Nach einem Neuladen der Webseite erscheint das Admin-Panel in der Navigation.

## 📄 Dokumentation

Weitere Details finden Sie in den spezifischen Dokumenten:
- [Firebase Setup & Migration](docs/FIREBASE_SETUP.md)
- [OAuth Setup Guide (Discord & Google)](docs/OAUTH_SETUP.md)
- [Automatisierte Google Drive Backups](docs/BACKUP_SETUP.md)

---
Entwickelt für die Guild Wars 2 Community.
