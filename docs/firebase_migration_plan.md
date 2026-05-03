# Implementierungsplan: Firebase Migration (NoSQL-Pivot)

Dieses Dokument trackt den Status der Migration des **GW2 Alliance Managers** auf eine **rein kostenlose Firebase-Infrastruktur**.

## 📊 Status-Übersicht
- **Aktueller Status**: ✅ Abgeschlossen (Pivot auf Firestore NoSQL erfolgreich)
- **Ziel-Architektur**: 
  - Next.js SSR → Docker-basiert (vorbereitet für Firebase App Hosting)
  - Datenbank → **Google Firestore (NoSQL)** – *Prisma wurde vollständig entfernt*
  - Hintergrund-Jobs (Cron) → Webhook-Pattern & Firebase Functions
  - Dateispeicher → Firebase Cloud Storage (vorbereitet)

---

## 🏗 Phase 1: Analyse & NoSQL-Design
- [x] **1.1 Datenbank-Strategie klären**
- [x] **1.2 Datenmodell-Mapping (SQL zu NoSQL)**
- [x] **1.3 Cron-Jobs & Background Tasks**

## ⚙️ Phase 2: Firebase Projekt & SDK Setup
- [x] **2.1 Firebase Projekt erstellen**
- [x] **2.2 Firebase CLI & Admin SDK**
- [x] **2.3 Firebase App Hosting verknüpfen** (Optional, Docker-kompatibel)

## 💻 Phase 3: Der große Umbau (Codebase)
- [x] **3.1 Prisma-Entfernung**
- [x] **3.2 Neue Database-Lib erstellen**
- [x] **3.3 Refactoring der Server Actions & API Routes**
- [x] **3.4 Authentifizierung (NextAuth)**

## 🧪 Phase 4: Testplan (NoSQL Verifizierung)
- [x] **Test:** Funktionieren Joins? (Manuelle Auflösung von Gilden-IDs implementiert).
- [x] **Test:** Performance der Mitgliederliste (Denormalisierte Datenstrukturen).
- [x] **Test:** Roster-Sync schreibt Daten korrekt in Firestore-Dokumente.
- [x] **Test:** Historie-Einträge werden korrekt als Sub-Collection gespeichert.

## 🚀 Phase 5: Produktion & Daten-Umzug
- [x] **5.1 Migrationsskript schreiben**
  - [x] Skript finalisiert & erfolgreich getestet.
- [ ] **5.2 Finaler Rollout (Online)**
  - [ ] Firebase Projekt live schalten & Billing aktivieren.
  - [ ] GitHub Repository mit Firebase App Hosting verknüpfen.
  - [ ] DNS/Domain auf Firebase umstellen.
  - [ ] Finales Migrationsskript gegen Produktions-DB ausführen.
- [x] **5.3 Cleanup & Doku**
  - [x] Deep-Clean Skripte für Emulator-Resets erstellt.
  - [x] Dokumentation für Firebase Setup aktualisiert.

