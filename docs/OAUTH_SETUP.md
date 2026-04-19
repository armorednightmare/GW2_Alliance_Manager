# OAuth Setup Guide - Discord & Google

In dieser Anleitung erfahren Sie, wie Sie die notwendigen Client-IDs und Secrets für den Discord- und Google-Login in Ihrem **GW2 Alliance Manager** einrichten.

---

## 🔵 1. Discord OAuth Setup

1.  **Discord Developer Portal**: Gehen Sie auf [discord.com/developers/applications](https://discord.com/developers/applications).
2.  **Neue App**: Klicken Sie auf **"New Application"** und geben Sie einen Namen ein (z. B. "Allianz Manager").
3.  **OAuth2 Einstellungen**:
    *   Gehen Sie links im Menü auf **"OAuth2"**.
    *   Klicken Sie auf **"Add Redirect"**.
    *   Fügen Sie Ihre Callback-URL hinzu:
        *   Lokal: `http://localhost:3000/api/auth/callback/discord`
        *   Live: `https://deinedomain.com/api/auth/callback/discord`
4.  **Credentials abrufen**:
    *   Unter **"Client ID"** finden Sie Ihre ID.
    *   Klicken Sie bei **"Client Secret"** auf **"Reset Secret"** (falls noch nicht generiert), um das Secret zu erhalten.
5.  **Environment Variables**: Tragen Sie die Werte in Ihre `.env` ein:
    ```env
    DISCORD_CLIENT_ID="DEINE_ID"
    DISCORD_CLIENT_SECRET="DEIN_SECRET"
    ```

---

## 🔴 2. Google OAuth Setup

1.  **Google Cloud Console**: Gehen Sie auf [console.cloud.google.com](https://console.cloud.google.com/).
2.  **Projekt erstellen**: Erstellen Sie ein neues Projekt oder wählen Sie ein bestehendes aus.
3.  **APIs & Services**:
    *   Gehen Sie zu **"APIs & Services"** -> **"OAuth consent screen"**.
    *   Wählen Sie **"User Type: External"** und füllen Sie die Pflichtfelder aus.
4.  **Credentials erstellen**:
    *   Gehen Sie zu **"Credentials"** -> **"Create Credentials"** -> **"OAuth client ID"**.
    *   Wählen Sie **"Application type: Web application"**.
    *   **Authorized JavaScript origins**: `http://localhost:3000` (und Ihre Live-URL).
    *   **Authorized redirect URIs**:
        *   Lokal (Login): `http://localhost:3000/api/auth/callback/google`
        *   Lokal (Backup): `http://localhost:3000/api/admin/backup/callback`
        *   Live (Login): `https://deinedomain.com/api/auth/callback/google`
        *   Live (Backup): `https://deinedomain.com/api/admin/backup/callback`
5.  **Client ID & Secret**: Nach dem Klick auf **"Create"** erhalten Sie Ihre Client ID und Ihr Client Secret.
6.  **Environment Variables**: Tragen Sie die Werte in Ihre `.env` ein:
    ```env
    GOOGLE_CLIENT_ID="DEINE_ID"
    GOOGLE_CLIENT_SECRET="DEIN_SECRET"
    ```

---

> [!IMPORTANT]
> **HTTPS-Zwang**: Google und teilweise auch Discord erlauben die Nutzung von OAuth auf externen Servern nur über eine gesicherte **HTTPS**-Verbindung. Für lokale Tests ist `http://localhost:3000` jedoch zulässig.

> [!TIP]
> Vergessen Sie nicht, nach der Konfiguration die `.env`-Datei zu speichern und den Docker-Container neu zu starten (`docker-compose restart web`), damit die Änderungen wirksam werden.
