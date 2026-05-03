# Firebase Setup & Migration

Dieses Dokument beschreibt die Konfiguration von Firebase Firestore für den GW2 Alliance Manager.

## 🏛 Architektur

Die Anwendung nutzt **Firebase Firestore** als primäre Datenbank. Für die lokale Entwicklung wird die **Firebase Emulator Suite** verwendet, um keine Kosten zu verursachen und offline arbeiten zu können.

### Daten-Modell (Firestore)
- `settings/main`: Globale Allianz-Einstellungen (Farben, Name, Logo).
- `guilds/{guildId}`: Informationen über synchronisierte Gilden.
- `members/{memberId}`: Mitglieder-Daten inklusive eines Sub-Collections `history`.
- `members/{memberId}/history/{eventId}`: Historie von Rangänderungen, Beitritten etc.
- `users/{userId}`: Web-Benutzer (Admins, Leiter) mit Verknüpfung zu GW2-Mitgliedern.
- `roles/{roleId}`: Manuelle Rollendefinitionen.

---

## 💻 Lokale Entwicklung (Emulator)

Der Emulator startet automatisch mit `docker-compose up`.

- **Web App**: `http://localhost:3001`
- **Emulator UI**: `http://localhost:4000` (Hier können Sie Daten live im Browser einsehen/löschen)
- **Firestore Port**: `8080`
- **Auth Port**: `9099`

### Datenbank leeren (Reset)
Um die lokale Datenbank komplett zu löschen und einen sauberen Zustand zu erhalten:
```bash
docker exec gw2-web-firebase npx tsx scripts/clear-all-firebase.ts
```

---

## 🚀 Migration von SQL (PostgreSQL) zu Firebase

Wenn Sie von einer alten Version des Managers migrieren möchten, nutzen Sie das Migrations-Skript.

### Voraussetzungen
1. Die alte PostgreSQL-Datenbank muss erreichbar sein.
2. In der `.env` muss die `DATABASE_URL` (oder `DATABASE_URL_RAILWAY`) gesetzt sein.

### Migration ausführen
```bash
docker exec -e DATABASE_URL="ihr_postgres_link" gw2-web-firebase npx tsx scripts/migrate-railway-to-firebase.ts
```

Das Skript migriert automatisch:
- Gilden & deren Einstellungen
- Mitglieder & deren Historie
- Web-Benutzer (inklusive Passwörter!)
- Manuelle Rollen
- System-Einstellungen

---

## ☁️ Produktion (Google Cloud / Firebase Hosting)

Der GW2 Alliance Manager ist für **Firebase App Hosting** optimiert. Dies ist der empfohlene Weg für Next.js 14 Anwendungen.

### 1. Projekt vorbereiten
1. Projekt in der [Firebase Console](https://console.firebase.google.com/) erstellen.
2. Auf **Blaze-Plan** upgraden (erforderlich für Server-Side Rendering und Functions).
3. **Firestore** im Native Mode aktivieren (Standort: `eur3` für EU empfohlen).
4. **Authentication** aktivieren (Email/Password Methode).

### 2. Deployment via App Hosting
1. In der Firebase Console zu **App Hosting** navigieren.
2. GitHub Repository verknüpfen.
3. Deployment-Einstellungen:
   - Framework: `Next.js` (wird automatisch erkannt).
   - Umgebungsvariablen: Alle Variablen aus deiner `.env` müssen im **Google Cloud Secret Manager** hinterlegt werden. Firebase App Hosting bietet hierfür einen geführten Prozess an.

### 3. Live-Migration (Der finale Umzug)
Sobald die App online ist, müssen die Daten migriert werden:

1. Hole dir den **Service Account JSON Key** (Projekt-Einstellungen -> Servicekonten).
2. Trage die Daten in deine lokale `.env` ein:
   ```env
   FIREBASE_PROJECT_ID="..."
   FIREBASE_CLIENT_EMAIL="..."
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```
3. **WICHTIG**: Kommentiere die Emulator-Variablen (`FIRESTORE_EMULATOR_HOST`) aus, damit das Skript gegen die echte Cloud läuft.
4. Starte die Migration:
   ```bash
   npx tsx scripts/migrate-railway-to-firebase.ts
   ```

---

## 🛠 Entwicklung & Fehlerbehebung

### Lokaler Reset (Nur Emulator!)
Wenn du lokal im Emulator alles auf Null setzen willst:
```bash
docker exec gw2-web-firebase npx tsx scripts/clear-all-firebase.ts
```
