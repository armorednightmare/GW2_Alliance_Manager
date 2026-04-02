# Technische Dokumentation - GW2 Alliance Manager

Diese Dokumentation bietet einen technischen Überblick über die Architektur, das Datenmodell und die internen Prozesse der Anwendung.

## 🏗 Architektur-Übersicht

Der **GW2 Alliance Manager** ist eine moderne Web-Anwendung, die auf dem Next.js App Router basiert. Sie kombiniert Server-Side-Rendering (SSR) für eine schnelle Darstellung mit Client-Side-Rendering (CSR) für interaktive Dashboards.

### Kern-Komponenten:

1. **Next.js App Router**: Verwendet Server Components für maximale Performance und Sicherheit bei Datenbankzugriffen.
2. **Prisma ORM**: Dient als Abstraktionsschicht für die PostgreSQL-Datenbank und garantiert Typsicherheit im gesamten Projekt.
3. **Guild Wars 2 API Integration**: Ein dedizierter Sync-Worker (`lib/gw2api.ts`), der Roster-Daten abruft und mit der Datenbank abgleicht.
4. **NextAuth.js**: Verwaltet die Authentifizierung über Discord, Google und lokale E-Mail/Passwort-Konten.

---

## 💾 Datenmodell (ER-Diagramm Logik)

Das Datenmodell ist in `prisma/schema.prisma` definiert. Die wichtigsten Entitäten sind:

### 1. Guild (Gilde)
Speichert Informationen über die in der Allianz vertretenen Gilden.
- `id`: GW2 Guild ID (e.g. `XXXX-XXXX-XXXX`)
- `name` / `tag`: Der offizielle Gildenname und das Kürzel.
- `leaderToken`: Der API-Key des Gildenleiters, der für den Roster-Sync benötigt wird.
- `isAllianceGuild`: Markiert die Hauptgilde der Allianz.
- `shareHistoryWithAlliance`: Ein Flag, mit dem Gildenleiter entscheiden können, ob interne Bewegungen für Außenstehende sichtbar sind.

### 2. Member (Mitglied)
Repräsentiert einen GW2-Account.
- `accountName`: GW2 Account (z.B. `User.1234`).
- `status`: Markiert den aktuellen Status des Mitglieds:
    - `ACTIVE`: Das Mitglied ist derzeit in mindestens einer der getrackten Gilden im Roster vorhanden.
    - `INACTIVE_LEFT`: Das Mitglied war zuvor in einer Gilde, wird aber im aktuellen API-Roster nicht mehr gefunden (Gilde verlassen oder entfernt).
    - `FRIEND`: Ein manuell hinzugefügter Gast oder ein Account, der nicht direkt zur Allianz gehört, aber in der Datenbank geführt wird.
- `wvwMember` (Kampfgilde): Markiert, ob das Mitglied Teil einer Gilde ist, die als aktive WvW-Kampfgilde innerhalb der Allianz registriert ist.
- `isAllianceMember` (Allianz): Gibt an, ob der Account offiziell zum Kern-Allianz-Verbund gehört.
- `guild` / `subGuild`: Beziehungen zur Haupt-Allianzgilde und zur spezifischen Kampfgilde.

### 3. MemberHistory (Ereignisverlauf)
Protokolliert alle wichtigen Ereignisse pro Mitglied.
- `eventType`: `JOINED`, `LEFT`, `RANK_CHANGE`, `WVW_STATUS_CHANGE`, `COMMENT_ADDED`, `COMMENT_CHANGED`.
- `oldValue` / `newValue`: Dokumentiert Änderungen (z.B. von Rang A zu Rang B).

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
2. **Abgleich (Diffing)**: Die Daten werden mit der bestehenden Datenbank verglichen.
3. **Historisierung**: Jede Änderung (z.B. Rangänderung oder Austritt) wird automatisch als neuer Eintrag in `MemberHistory` gespeichert.

Ein Hintergrund-Worker (`lib/sync-worker.ts`) kann konfiguriert werden, um diese Aufgabe in regelmäßigen Intervallen (Standard: 60 Minuten) automatisch im laufenden Docker-Container auszuführen.

---

## 🛠 Entwicklung & Wartung

- **Linter**: `npm run lint` zum Überprüfen der Code-Qualität.
- **Datenbank-Migrationen**: Änderungen am Schema in `prisma/schema.prisma` vornehmen und mit `npx prisma db push` anwenden.
- **Docker-Logs**: `docker logs -f gw2_alliance_manager-web-1` zum Überwachen des Synchronisations-Workers.
