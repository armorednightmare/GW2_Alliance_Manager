# Deployment Guide - Externes Hosting

Dieser Guide beschreibt die notwendigen Schritte, um den **GW2 Alliance Manager** auf einem externen Server (VPS, Dedicated Server) produktiv zu betreiben.

## 🔑 1. Umgebungsvariablen für Produktion

Beim Wechsel von `localhost` auf eine echte Domain müssen in der `.env`-Datei folgende Variablen angepasst werden:

```env
# Die volle URL deiner Live-Instanz (WICHTIG für NextAuth)
NEXTAUTH_URL="https://allianz.deinedomain.com"

# Eine sichere, zufällige Zeichenfolge für Verschlüsselung
NEXTAUTH_SECRET="dein-langes-geheimes-passwort"

# Die Datenbank-URL (falls DB extern ist, sonst bleibt 'db' bei Docker)
DATABASE_URL="postgresql://user:pass@db:5432/gw2alliance"
```

---

## 🌐 2. OAuth-Konfiguration (Discord & Google) - **OPTIONAL**

Falls Sie den Login über externe Anbieter ermöglichen möchten, müssen die **Callback-URLs** in den jeweiligen Developer-Portalen korrekt hinterlegt sein. Eine detaillierte Schritt-für-Schritt-Anleitung dazu finden Sie im **[OAuth Setup Guide](OAUTH_SETUP.md)**.

### Discord Developer Portal:
- Navigiere zu deiner App -> `OAuth2` -> `Redirects`.
- Füge folgende URL hinzu: `https://allianz.deinedomain.com/api/auth/callback/discord`

### Google Cloud Console:
- Navigiere zu `APIs & Services` -> `Credentials`.
- Füge unter "Authorized redirect URIs" hinzu: `https://allianz.deinedomain.com/api/auth/callback/google`

---

## 🏗 3. Reverse Proxy (Nginx Beispiel)

Da Next.js standardmäßig auf Port 3000 läuft, empfiehlt sich ein Reverse Proxy wie **Nginx**, um HTTPS (Port 443) zu verwalten und Anfragen an den Docker-Container weiterzureichen.

### Beispiel Konfiguration (`/etc/nginx/sites-available/allianz`):
```nginx
server {
    server_name allianz.deinedomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Wichtig für NextAuth hinter Proxy
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # verwaltet durch Certbot / Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/allianz.deinedomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/allianz.deinedomain.com/privkey.pem;
}

server {
    if ($host = allianz.deinedomain.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name allianz.deinedomain.com;
    return 404;
}
```

---

## 📦 4. Docker für Produktion nutzen

Für die Produktion solltest du ein optimiertes `Dockerfile` verwenden. Da aktuell nur ein `Dockerfile.dev` existiert, hier die Empfehlung für den produktiven Betrieb:

### Empfohlenes Produktions-Setup (`docker-compose.yml` Anpassung):
Stelle sicher, dass der Container mit dem `node:18-alpine` Image läuft und der Build-Prozess `next build` ausführt.

```bash
# Baue das Image und starte die Container im Hintergrund
docker-compose up -d --build
```

**Wichtig:** Nach jedem Update des Codes auf dem Server muss der Build-Prozess erneut durchlaufen werden:
```bash
git pull
docker-compose restart web
```

---

## 💾 5. Datenbank & Backups

Wenn du die Datenbank im Docker-Container lässt, stelle sicher, dass das Volume persistent ist:

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```

**Backup-Empfehlung:** Erstelle regelmäßige SQL-Dumps deiner Datenbank:
```bash
docker exec -t gw2_alliance_manager-db-1 pg_dumpall -c -U postgres > backup_$(date +%F).sql
```

---

> [!IMPORTANT]
> **HTTPS ist Pflicht!** NextAuth und Google/Discord OAuth funktionieren aus Sicherheitsgründen auf externen Servern ausschließlich über eine verschlüsselte HTTPS-Verbindung. Nutze `Certbot` für kostenlose Zertifikate.
