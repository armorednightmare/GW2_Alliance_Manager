# Automatisierte Backups mit Google Drive

Der GW2 Alliance Manager speichert seine Daten in **Firebase Firestore**. Obwohl Firestore extrem ausfallsicher ist, können Backups als zusätzliche Sicherheit vor menschlichen Fehlern oder für lokale Auswertungen (JSON-Export) nützlich sein. 

Die App bietet eine nahtlose Integration, um Backups direkt in dein **Google Drive** hochzuladen. 

## Voraussetzungen
Die App nutzt den offiziellen Google OAuth-Flow. Dafür benötigst du in deiner Google Cloud Console ein Projekt mit aktivierter **Google Drive API**.
*(Falls du den Google-Login für die App eingerichtet hast, hast du das meiste davon bereits getan!)*

1. Gehe zur [Google Cloud Console](https://console.cloud.google.com/).
2. Suche nach `Google Drive API` und klicke auf **Aktivieren**.
3. Gehe zu **APIs & Dienste > OAuth-Zustimmungsbildschirm** und stelle sicher, dass deine E-Mail-Adresse als Testnutzer eingetragen ist (falls die App auf "Testing" steht).
4. Stelle sicher, dass du in der `.env` Datei folgende Variablen hast:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `BACKUP_ENCRYPTION_KEY` (ein sicherer, zufälliger String, z.B. 32 Zeichen)

## Schritt 1: Mit Google Drive verbinden

Die Einrichtung erfolgt komplett im **Admin Panel** der laufenden App:

1. Öffne den **GW2 Alliance Manager** in deinem Browser und logge dich als `ADMIN` ein.
2. Gehe ins **Admin Panel**.
3. Scrolle zum Bereich **"Datenbank Backup (Google Drive)"**.
4. Klicke auf den Button **"Mit Google Drive verbinden"**.
5. Du wirst zu Google weitergeleitet. Akzeptiere die Erlaubnis, dass die App Dateien in deinem Google Drive erstellen darf (Scope: `drive.file`).
6. Nach der erfolgreichen Weiterleitung ist dein Konto verknüpft! Das sensible Zugangs-Token (`Refresh Token`) wird dank deines `BACKUP_ENCRYPTION_KEY`s **sicher verschlüsselt** in der Firestore-Datenbank abgelegt.

## Schritt 2: Backup-Plan festlegen

Direkt unter der Verknüpfung im Admin Panel findest du ein Dropdown-Menü für den **Backup-Plan**:
- Täglich
- Wöchentlich (Sonntags)
- Monatlich (am 1.)

Wähle das gewünschte Intervall und klicke auf **Speichern**.

## Wie werden die Backups ausgeführt?

Es ist **kein separater Cronjob** für das Backup mehr nötig!
Die App hängt sich intelligent an den regulären **Roster Sync Job** (siehe `DEPLOYMENT.md` für die Einrichtung des Google Cloud Schedulers). 

Jedes Mal, wenn der Scheduler (z.B. alle 10 Minuten) den Endpunkt `/api/cron/sync` aufruft, prüft die App, ob dein eingestelltes Backup-Intervall bereits abgelaufen ist. 
- Ist es noch nicht soweit, macht die App nur den Gilden-Sync.
- Ist das Backup fällig, wird nach dem Gilden-Sync automatisch ein JSON-Export der gesamten Datenbank erstellt und in dein Google Drive geladen!

## Backups wiederherstellen / ansehen

- Die Backups landen in deinem Google Drive im Hauptverzeichnis unter dem Namen `gw2-alliance-backup_YYYY-MM-DD.json`.
- Im **Admin Panel** siehst du eine Historie der letzten Backups und kannst diese auch manuell mit einem Klick auf "Jetzt Backup erstellen" anstoßen.
