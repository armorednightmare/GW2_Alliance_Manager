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
- **Datenbank**: [PostgreSQL](https://www.postgresql.org/) mit [Prisma ORM](https://www.prisma.io/)
- **Authentifizierung**: [NextAuth.js](https://next-auth.js.org/)
- **Deployment**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

## 📋 Voraussetzungen

- Docker & Docker Compose installiert.
- (Optional für lokale Entwicklung) Node.js 18+ & npm.
- Ein GW2 API-Key mit den Berechtigungen `account`, `wvw` und `guilds` (für Gildenleiter) bzw. nur `account` (für reguläre Mitglieder zur Profil-Verknüpfung).

## 🔧 Installation & Setup

### 1. Repository klonen
```bash
git clone https://github.com/dein-nutzername/gw2-alliance-manager.git
cd gw2-alliance-manager
```

### 2. Umgebungsvariablen konfigurieren
Erstellen Sie eine `.env` Datei im Hauptverzeichnis basierend auf der Vorlage `.env.example`:

```bash
cp .env.example .env
```

Konfigurieren Sie die erforderlichen Variablen (Datenbank & NextAuth). Die Sektionen für **Discord** und **Google** sind **optional** und werden nur für den OAuth-Login benötigt.


### 3. Start mit Docker
```bash
docker-compose up -d --build
```
Die Anwendung ist nun unter `http://localhost:3000` erreichbar. Die Datenbank wird automatisch initialisiert.

### 4. Datenbank-Schema initialisieren (falls nötig)
```bash
docker exec gw2_alliance_manager-web-1 npx prisma db push
```

## 📄 Dokumentation

Weitere Details finden Sie in den spezifischen Dokumenten:
- [Technische Dokumentation (Architektur)](docs/TECHNICAL.md)
- [Bereitstellungs-Guide (Externes Hosting)](docs/DEPLOYMENT.md)
- [OAuth Setup Guide (Discord & Google)](docs/OAUTH_SETUP.md)
- [User-Guide (Wiki)](docs/USER_GUIDE.md)
- [Automatisierte Google Drive Backups](docs/BACKUP_SETUP.md)

---
Entwickelt für die Guild Wars 2 Community.
