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
- **Lokale Entwicklung**: [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- **Deployment**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

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

### 3. Start mit Docker
```bash
docker-compose up -d --build
```
Die Anwendung ist nun unter `http://localhost:3001` (Web) und `http://localhost:4000` (Firebase Emulator UI) erreichbar.

### 4. Admin-Nutzer erstellen
Nach dem ersten Start müssen Sie einen initialen Administrator anlegen:
```bash
docker exec gw2-web-firebase node create-admin.js
```

## 📄 Dokumentation

Weitere Details finden Sie in den spezifischen Dokumenten:
- [Firebase Setup & Migration](docs/FIREBASE_SETUP.md)
- [OAuth Setup Guide (Discord & Google)](docs/OAUTH_SETUP.md)
- [Automatisierte Google Drive Backups](docs/BACKUP_SETUP.md)

---
Entwickelt für die Guild Wars 2 Community.
