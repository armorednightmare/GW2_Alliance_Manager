# Technische Dokumentation - GW2 Alliance Manager

Diese Dokumentation bietet einen technischen Überblick über die Architektur, das Datenmodell und die internen Prozesse der Anwendung.

## 🏗 Architektur-Übersicht

Der **GW2 Alliance Manager** ist eine moderne Web-Anwendung, die auf dem Next.js App Router basiert. Sie kombiniert Server-Side-Rendering (SSR) für eine schnelle Darstellung mit Client-Side-Rendering (CSR) für interaktive Dashboards.

### Kern-Komponenten:

1. **Next.js App Router**: Verwendet Server Components für maximale Performance und Sicherheit bei Datenbankzugriffen.
2. **Firebase Admin SDK**: Dient als Abstraktionsschicht für die Firestore NoSQL-Datenbank und die Authentifizierung.
3. **Guild Wars 2 API Integration**: Ein dedizierter Sync-Worker (`lib/gw2api.ts`), der Roster-Daten abruft und mit Firestore abgleicht.
4. **NextAuth.js**: Verwaltet die Authentifizierung über Discord, Google und lokale E-Mail/Passwort-Konten via Firebase-Adapter.

---

## 💾 Datenmodell (NoSQL-Architektur)

Das Datenmodell ist für hohe Lese-Performance denormalisiert und in Firebase Firestore organisiert:

### 1. Guilds (Collection: `guilds`)
Speichert Informationen über die in der Allianz vertretenen Gilden.
- `id`: GW2 Guild ID (z.B. `XXXX-XXXX-XXXX`)
- `name` / `tag`: Der offizielle Gildenname und das Kürzel.
- `leaderToken`: Der API-Key des Gildenleiters für den Sync.
- `isAllianceGuild`: Markiert die Hauptgilde der Allianz.

### 2. Members (Collection: `members`)
Repräsentiert einen GW2-Account. Enthält alle aktiven Gilden-Mitgliedschaften als Array.
- `accountName`: GW2 Account (z.B. `User.1234`).
- `status`: `ACTIVE`, `INACTIVE_LEFT`, `FRIEND`.
- `guilds`: Ein Array von Objekten `{id, name, tag, rank, isAllianceGuild, lastSeenAt}`.
- `manualRole` / `comment`: Manuelle Notizen und Rollen.

### 3. History (Sub-Collection: `members/{id}/history`)
Protokolliert Ereignisse pro Mitglied.
- `eventType`: `JOINED`, `LEFT`, `RANK_CHANGE`, `WVW_STATUS_CHANGE`, `COMMENT_CHANGED` etc.
- `description`: Textuelle Beschreibung des Ereignisses.
- `oldValue` / `newValue`: Dokumentiert Änderungen.
- `timestamp`: ISO-Datum der Änderung.

---

## 🔐 Berechtigungssystem

Die Anwendung nutzt ein Rollensystem (`lib/permissions.ts`), um den Zugriff zu kontrollieren:

| Rolle | Berechtigungen |
| :--- | :--- |
| **ADMIN** | Voller Systemzugriff, Theme-Management, Nutzerverwaltung. |
| **ALLIANCE_LEADER** | Kann alle Gilden einsehen, Roster-Syncs auslösen und Statistiken sehen. |
| **GUILD_LEADER** | Kann exklusiv die Mitglieder seiner eigenen Gilden verwalten und Notizen/Kommentare für diese einsehen. |
| **WEB_MEMBER** | Eingeschränkte Read-Only Ansicht einiger Statistiken. Keine Einsicht in Kommentare oder private Historien. |

---

## 🔄 Roster-Synchronisation

Die Synchronisation erfolgt in drei Phasen (`lib/gw2api.ts`):

1. **API-Fetch**: Für jede registrierte Gilde wird das Roster über die GW2 API abgerufen.
2. **Abgleich (Diffing)**: Die API-Daten werden mit den Dokumenten in Firestore verglichen.
3. **Historisierung**: Jede Änderung wird als Dokument in der `history` Sub-Collection des Mitglieds gespeichert.

Der Sync kann manuell im Admin-Panel oder automatisiert via Cron/Firebase Functions ausgelöst werden.

---

## 🛠 Entwicklung & Wartung

- **Firebase Emulator**: Lokale Entwicklung läuft via `docker-compose` und nutzt den Firestore/Auth Emulator.
- **Data Cleanup**: `docker exec gw2-web-firebase npx tsx scripts/clear-all-firebase.ts` zum Leeren der Emulator-Datenbank.
- **Docker-Logs**: `docker logs -f gw2-web-firebase` zum Überwachen der Server-Logs.
