# GW2 Alliance Manager - Agent Context & Skills

Dieses Dokument dient als Gedächtnisstütze für den KI-Agenten, um Kontext, Tools und Projekt-Richtlinien ohne Neustart-Probleme zu bewahren.

## 1. Domäne & Systemlogik (Guild Wars 2)
- **Kernkonzept**: Das Tool verwaltet in der Regel **eine einzige logische WvW-Allianz**, die aus mehreren "normalen" Gilden besteht.
- **Allianzgilden vs. Subgilden**: In der Datenbank liegen alle Gilden gemeinsam in der Tabelle `Guild`.  
  - Haupt-Gilden (die für WvW als Sammelbecken dienen) haben den Flag `isAllianceGuild = true`.
  - Herkömmliche Gilden / PvE-Gilden haben `isAllianceGuild = false`.
  - *Wichtig:* Aktuell existiert in der DB keine direkte Fremdschlüssel-Zuordnung von Subgilde zu Allianzgilde. Sie werden stattdessen logisch durch das Layout in Listen und Tabellen visuell abgetrennt (z.B. Subgilden auflisten, Allianzgilde gesondert ganz unten anhängen).

## 2. Tech Stack & Architektur
- **Framework**: Next.js 14+ (App Router). Dementsprechend finden Routen in `app/ ` als `page.tsx` und Server-Funktionen in `actions.ts` statt.
- **UI & Styling**: Vanilla CSS. Wir nutzen **kein TailwindCSS**. 
  - Standard-Vokabular für UI: **Glassmorphism** (`.glass-panel`), abgerundete Ecken, Blur-Filter, Hover-Effekte und Neon/Accent-Schatten.
- **Datenbank**: PostgreSQL angesprochen über Prisma ORM 7 (`schema.prisma`).
- **Authentifizierung**: NextAuth (in `lib/auth.ts`).

## 3. Lokales Environment & Docker
- Das Backend läuft in einem **Docker Compose** Setup. 
- Um Änderungen, die einen Server-Neustart erfordern, zu übernehmen, wird typischerweise `docker-compose restart web` über das integrierte Projekt-Terminal ausgeführt.
- Wenn Prisma-Befehle (z.B. Migrationen) ausgeführt werden sollen, stets darauf achten, ob es den Container beeinflusst (`docker-compose exec web npx prisma ...`) oder lokal angestoßen werden kann.
- **Node/NPM lokal oft nicht verfügbar:** Im Host-Terminal kann der Befehl `npm` fehlschlagen, da die Node-Umgebung primär im Docker-Container gekapselt ist. Sollen Packages installiert oder Skripte ausgeführt werden, sollte dies aus sicherer Entfernung direkt über den Container passieren (Beispiel: `docker-compose exec web npm install <package>`).

## 4. Wichtige Terminal-Einschränkungen (PowerShell 5.1)
- Die Hintergrund-Terminal-Execution-Engine des Antigravity/Agenten greift hardcoded auf die klassische **Windows PowerShell 5.1** (`powershell.exe`) zurück – auch wenn der User interaktiv `pwsh` nutzt.
- **KRITISCHE REGEL FÜR BEFEHLE**: Der Agent **darf niemals `&&` oder `||`** verwenden, da dies in PS5.1 zu Syntax-Fehlern führt.
- **LÖSUNG**: Kommandos müssen zwingend mit **Semikolon `;`** getrennt werden. 
  *(Beispiel: `git add . ; git commit -m "update" ; git push`)*.

## 5. Git-Workflow & Push-Regel
- **KEIN AUTOMATISCHER PUSH**: Der Agent darf niemals ohne explizite Aufforderung des Users einen `git push` ausführen. Änderungen werden standardmäßig nur lokal committet, es sei denn, der User verlangt ausdrücklich den Push.

## 6. Zielgruppe & Design-Ästhetik
- Das Design muss stets modern und "wow" wirken, da es für eine Gamer-Community entwickelt wird.
- Leere Zustände (Empty States), Lade-Layouts und Fehler-Meldungen müssen ins dunkle Glass-Design (Transparenz, Glow/Text-Shadows) integriert werden.

## 7. Historische Fallstricke & Bekannte Fehlerquellen
- **Prisma Build Error in Docker (Railway Deployment):** In der Vergangenheit gab es einen `PrismaConfigEnvError` während des Builds, weil die `DATABASE_URL` im reinen Build-Kontext fehlte. Bei Änderungen an der Dockerfile oder dem Deployment-Prozess muss sichergestellt sein, dass Prisma beim Aufruf von `npx prisma generate` Zugriff auf nötige (Dummy-)Envs hat.
- **Komplexe Berechtigungs-Logik (Sichtbarkeit):** Die Privacy-Regeln des Projekts sind strikt. Ein Gildenleiter darf im Profil und Verlauf **nur** Ränge, Kommentare und spezifische Historien-Einträge von Spielern sehen, die seine *eigene(n)* Gilde(n) betreffen. Private Daten anderer Subgilden bleiben verborgen. Ausnahme: Fraktionsweite Events (z.B. "verlässt die Allianz") dürfen eingesehen werden.
- **Der Excel-Mitglieder-Import (UI-State & Persistenz):** Beim Hochladen von Excel-Listen (Spalten-Mapping) neigt die UI bei unsauberem Code zu "Resets" beim ersten Upload, oder Daten werden nicht korrekt an die DB weitergeleitet. Änderungen im `ImportManagementClient` müssen bezüglich React-State-Management (`useState` Hooks) immer mit Vorsicht behandelt werden.
