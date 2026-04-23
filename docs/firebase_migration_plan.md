# Implementierungsplan: Firebase Migration

Dieses Dokument trackt den Status und die einzelnen Schritte für die Migration des **GW2 Alliance Managers** auf **Google Firebase** (spezifisch: Firebase App Hosting für Next.js).

## 📊 Status-Übersicht
- **Aktueller Status**: 🟡 In Planung
- **Ziel-Architektur**: 
  - Next.js SSR → **Firebase App Hosting**
  - PostgreSQL → **Google Cloud SQL (PostgreSQL)** oder bestehender externer DB-Provider
  - Hintergrund-Jobs (Cron) → **Google Cloud Scheduler**
  - Temporäre Dateien (z.B. Excel-Uploads/Backups) → **Firebase Cloud Storage / Memory** (da Serverless/Stateless)

---

## 🏗 Phase 1: Analyse & Infrastruktur-Entscheidungen
- [ ] **1.1 Datenbank-Strategie klären**
  - Firebase bietet nativ nur NoSQL (Firestore/Realtime DB). Da wir **Prisma + PostgreSQL** nutzen, muss entschieden werden: Wird die DB extern belassen (z.B. Railway/Neon) oder auf **Google Cloud SQL** migriert?
- [ ] **1.2 Stateless / Serverless Architektur prüfen**
  - Prüfen, ob die App lokale Dateien schreibt (z.B. im `app/api/admin/backup` oder Excel-Upload). Serverless-Umgebungen sind *ephemeral* – Dateisystem-Schreibvorgänge müssen in den RAM (`/tmp`) oder direkt in den Cloud Storage umgelagert werden.
- [ ] **1.3 Cron-Jobs & Background Tasks**
  - Bisherige Cron-Implementierungen evaluieren.
  - Ziel: Next.js API-Route für Crons erstellen, die durch den Google Cloud Scheduler zeitgesteuert aufgerufen wird.

## ⚙️ Phase 2: Firebase Projekt & lokales Setup
- [ ] **2.1 Firebase Projekt erstellen**
  - Neues Projekt in der Firebase Console anlegen.
  - Blaze-Plan (Pay-as-you-go) aktivieren (notwendig für App Hosting / Cloud Functions).
- [ ] **2.2 Firebase CLI initialisieren**
  - `npm install -g firebase-tools`
  - `firebase login` und `firebase init` im Projekt ausführen.
- [ ] **2.3 Firebase App Hosting konfigurieren**
  - Repository-Verknüpfung via Firebase Console einrichten.
  - Environment-Variablen (Secrets) in Firebase App Hosting / Google Cloud Secret Manager hinterlegen (`DATABASE_URL`, `NEXTAUTH_SECRET`, Discord/Google Drive OAuth-Keys).

## 💻 Phase 3: Codebase Anpassungen
- [ ] **3.1 Next.js Konfiguration anpassen**
  - Überprüfen, ob `next.config.mjs` mit Firebase App Hosting kompatibel ist (z.B. Standalone Output, falls mit Cloud Functions gearbeitet wird, ansonsten nutzt App Hosting native Next.js-Builds).
- [ ] **3.2 API-Routen & Uploads refactoren**
  - Falls lokale Dateisystem-Schreibzugriffe vorhanden sind (z.B. beim Backup), diese auf Speicher-Streams oder Cloud Storage umbauen.
- [ ] **3.3 Prisma Client Instanziierung anpassen**
  - Sicherstellen, dass Prisma im Serverless-Umfeld keine Connection-Limits überschreitet (evtl. Prisma Accelerate oder sauberes Connection-Pooling).
- [ ] **3.4 Authentifizierung (NextAuth)**
  - `NEXTAUTH_URL` auf die neue Firebase-Domain aktualisieren.
  - Sicherstellen, dass Session-Cookies in der Firebase-Umgebung korrekt gesetzt und ausgelesen werden.

## 🧪 Phase 4: Testfälle & Verifizierung (Testplan)

Bevor der Master-Branch aktualisiert oder produktiv geschaltet wird, müssen folgende Tests in einer Preview-Umgebung (Firebase Preview URL) erfolgreich sein:

### A. Authentifizierung & Sessions
- [ ] **Test:** OAuth-Login (Discord) funktioniert.
- [ ] **Test:** Session bleibt über Page-Reloads bestehen.
- [ ] **Test:** Logout funktioniert ordnungsgemäß.

### B. Datenbank & Prisma (Lesen/Schreiben)
- [ ] **Test:** Profil-Daten werden korrekt ausgelesen.
- [ ] **Test:** Änderungen an Rollen oder Gilden im Admin-Panel werden korrekt gespeichert.
- [ ] **Test:** Keine Connection-Pool-Fehler bei mehrfachem, schnellem Reload.

### C. Hintergrund-Prozesse & APIs
- [ ] **Test:** Der API-Roster-Sync lässt sich manuell triggern und bricht nicht wegen Timeouts (Serverless Timeouts beachten!) ab.
- [ ] **Test:** Der Google Drive Backup-Prozess erstellt die Datei erfolgreich und sendet sie ab, ohne das lokale Dateisystem zu crashen.
- [ ] **Test:** Cloud Scheduler triggert die API-Routen erfolgreich (Sicherheits-Token verifizieren!).

### D. UI & Assets
- [ ] **Test:** Alle statischen Assets (CSS, Bilder) werden korrekt über das Firebase CDN geladen.
- [ ] **Test:** Glassmorphism und UI-Elemente rendern fehlerfrei.

## 🚀 Phase 5: Produktion & Migration
- [ ] **5.1 Datenbank-Migration** (falls umgezogen wird)
- [ ] **5.2 Finaler Deployment-Rollout** auf den Production-Channel.
- [ ] **5.3 DNS Update** (Custom Domain mit Firebase Hosting verbinden).
- [ ] **5.4 Monitoring & Logs** in Google Cloud Logging überwachen.

---
*Hinweis für den Agenten: Hake die Boxen in diesem Dokument durch `[x]` ab, sobald eine Aufgabe abgeschlossen wurde. Halte den Status aktuell, damit die Arbeit jederzeit pausiert und nahtlos fortgesetzt werden kann.*
