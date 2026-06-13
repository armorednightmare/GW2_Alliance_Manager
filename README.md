# GW2 Alliance Manager

🇬🇧 **English** | [🇩🇪 Deutsch](#-deutsch)

A powerful web tool for managing Guild Wars 2 alliances. Keep track of your members, automatically synchronize rosters via API, and manage permissions for guild leaders and administrators.

## 🚀 Features
- **Automatic Roster Sync**: Synchronizes member data directly from the GW2 API.
- **Role-based Permission System**: Granular access control for admins, alliance leaders, and guild leaders.
- **Multi-Guild Support**: Guild leaders can manage multiple sub-guilds within the alliance.
- **Activity History**: Seamless tracking of rank changes, joins, and leaves.
- **Customizable Design**: Integrated admin panel for customizing colors, logos, and alliance names.
- **Secure Authentication**: Support for Discord login, Google login, and classic email/password accounts.

## 🛠 Tech Stack
- **Frontend/Backend**: [Next.js 14](https://nextjs.org/) (App Router)
- **Database**: [Firebase Firestore](https://firebase.google.com/products/firestore)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) with Firebase-Admin
- **Local Development**: Docker & [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- **Production / Deployment**: [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## 📋 Requirements
- Docker & Docker Compose installed.
- A GW2 API key with the permissions `account`, `wvw`, and `guilds` (for guild leaders) or just `account` (for regular members to link profiles).

## 🔧 Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/armorednightmare/GW2_Alliance_Manager.git
cd GW2_Alliance_Manager
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory based on the `.env.example` template:
```bash
cp .env.example .env
```

### 3. Start with Docker (Local)
```bash
docker-compose up -d --build
```
The application is now accessible at `http://localhost:3001` (Web) and `http://localhost:4000` (Firebase Emulator UI).

### 4. Create the First Admin User
1. Log in to the finished website (Local or Live) using Discord, Google, or Email.
2. Go to the **Firebase Console** -> **Firestore Database**.
3. Open the `users` collection and find your newly created profile document.
4. Change the `role` field from `"WEB_MEMBER"` to `"ADMIN"`.
5. Refresh the website, and the Admin Panel will appear in the navigation.

---

<a name="-deutsch"></a>
# 🇩🇪 Deutsch

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
- **Datenbank**: [Firebase Firestore](https://firebase.google.com/products/firestore)
- **Authentifizierung**: [NextAuth.js](https://next-auth.js.org/) mit Firebase-Admin
- **Lokale Entwicklung**: Docker & [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- **Produktion / Deployment**: [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

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

### 4. Den ersten Admin-Nutzer erstellen
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
