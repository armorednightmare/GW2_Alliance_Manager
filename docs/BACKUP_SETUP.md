# Automatisierte Google Drive Backups

Der GW2 Alliance Manager enthält ein integriertes System, welches auf Basis eines Node-Cronjobs (Zeitplan) ein vollständiges Backup der PostgreSQL-Datenbank als `.sql` Auszug erstellt und in einem sichtbaren Google Drive Ordner (`GW2 Backups`) ablegt. Alte Backups werden automatisch rotiert (gelöscht), um die Cloud-Speicherkapazität (z.B. die kostenlosen 15 GB) zu schonen.

## Voraussetzungen

Damit die Authentifizierung an der Google API auch unbemannt (d.h. von einem Server im Hintergrund) funktioniert, benötigen wir ein **Google Cloud Service Account**.

### 1. Projekt erstellen & API aktivieren
1. Besuche die [Google Cloud Console](https://console.cloud.google.com/).
2. Erstelle ein neues Projekt oder wähle ein bestehendes aus.
3. Suche in der Suchleiste nach **Google Drive API** und klicke auf **Aktivieren**.

### 2. Service Account erstellen
1. Gehe in der Google Cloud Console zum Menüpunkt **APIs & Dienste -> Anmeldedaten** (Credentials).
2. Klicke oben auf **Anmeldedaten erstellen** und wähle **Dienstkonto** (Service Account).
3. Benenne den Account (z. B. "gw2-backup-bot"). Klicke auf "Erstellen und Fortfahren". Du musst dem Konto vorerst keine speziellen IAM-Rollen geben. Klicke auf "Fertig".
4. Klicke in der Liste der Dienstkonten auf dein soeben erstelltes Konto (die E-Mail-Adresse kopieren wir uns gleich – sie sieht aus wie `name@projekt.iam.gserviceaccount.com`).
5. Gehe oben auf den Reiter **Schlüssel** (Keys).
6. Klicke auf **Schlüssel hinzufügen -> Neuen Schlüssel erstellen**. 
7. Wähle als Format **JSON** und klicke auf "Erstellen".
   -> *Die JSON-Datei wird nun automatisch auf deinen Computer heruntergeladen.*

### 3. Google Drive Ordner teilen
Der Service Account hat standardmäßig sein *eigenes*, unsichtbares Laufwerk. Damit du die Backups in *deinem* persönlichen Drive siehst:
1. Gehe in dein persönliches [Google Drive](https://drive.google.com/).
2. Erstelle einen neuen Ordner mit dem Namen **GW2 Backups**.
3. Klicke per Rechtsklick auf den Ordner -> **Freigeben**.
4. Trage im Freigabe-Menge die Dienstkonto-E-Mailadresse aus Schritt 2.4 ein (`...@...iam.gserviceaccount.com`) und weise ihr **Editor**-Rechte (Mitbearbeiter) zu.

*(Optional)*: Kopiere die Ordner-ID aus der URL (das, was hinter `folders/` steht) und merke sie dir, falls du sie konfigurieren musst.

### 4. JSON Base64 eintragen
Die Docker-Umgebung liest die Google-Credentials am besten als einzelne Text-Umgebungsvariable.
Da JSON-Dateien Zeilenumbrüche enthalten, sollten wir sie kodieren. 

Führe lokal (im Terminal oder in PowerShell) folgenden Befehl über deine JSON-Datei aus, oder nutze eine Webseite wie [Base64Encode.org](https://www.base64encode.org/):

```bash
# Auf Linux/macOS
base64 -w 0 <path_to_downloaded_json>.json

# Auf Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("<pfad zur datei>.json"))
```

Füge den resultierenden riesigen Text-String in deine `.env`-Datei ein:
```env
GOOGLE_SERVICE_ACCOUNT_BASE64="eyJwcm9qZWN0X2lkIjoi...usw..."
```

*(Hinweis: Für das Zielverzeichnis stellen wir standardmäßig ein, dass das Programm automatisch in den per Namen "GW2 Backups" genannten Ordner hochlädt, wenn es ihn findet. Falls es nicht klappt, ergänze `GOOGLE_DRIVE_FOLDER_ID="deine_ordner_id"`).*

## Wie funktioniert die Speicherung?
Der Cron-Job im Container prüft regelmäßig, ob der Backup-Lauf ansteht. 
Er nutzt das Tool `pg_dump`, weswegen auf dem Container `postgresql-client` installiert sein muss.
Es werden per Vorgabe maximal 4 Backups gespeichert (Standard-Einstellung). Wenn das 5. Backup hochgeladen wird, wird automatisch das älteste Backup vom Service Account in Google Drive gelöscht.
