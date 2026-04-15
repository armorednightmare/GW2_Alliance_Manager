import { google } from 'googleapis';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';
import { decrypt } from './crypto';

const execAsync = util.promisify(exec);

const FOLDER_NAME = 'GW2 Backups';
const MAX_BACKUPS = process.env.MAX_BACKUPS ? parseInt(process.env.MAX_BACKUPS) : 4;

/**
 * Returns an authenticated Google Drive client and the target folder ID.
 */
export async function getGoogleDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // 1. Try Database (Encrypted)
  const settings = await prisma.systemSettings.findFirst();
  let refreshToken = settings?.backupRefreshToken;
  
  if (refreshToken) {
    try {
      refreshToken = decrypt(refreshToken);
    } catch (e: any) {
      console.error("❌ Fehler beim Entschlüsseln des Backup-Tokens:", e.message);
      refreshToken = null;
    }
  }

  // 2. Fallback to Environment Variable
  if (!refreshToken) {
    refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  }

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Weder verschlüsselter DB-Token noch GOOGLE_REFRESH_TOKEN in .env gefunden.");
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  const drive = google.drive({ version: 'v3', auth });

  // Find or Use Target Folder
  let targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;
  
  if (!targetFolderId) {
    const res = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    if (res.data.files && res.data.files.length > 0) {
      targetFolderId = res.data.files[0].id!;
    } else {
      const folderRes = await drive.files.create({
        requestBody: {
          name: FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
        supportsAllDrives: true,
      });
      targetFolderId = folderRes.data.id!;
      console.log(`📁 Erstellter Backup-Ordner id: ${targetFolderId}`);
    }
  }

  return { drive, targetFolderId };
}

export async function runDatabaseBackup() {
  console.log("🔒 Starting automated Database Backup...");

  let drive;
  let targetFolderId;

  try {
    const driveInfo = await getGoogleDriveClient();
    drive = driveInfo.drive;
    targetFolderId = driveInfo.targetFolderId;
  } catch (e: any) {
    console.log(`ℹ️ ${e.message} Backup übersprungen.`);
    return;
  }

  // 2. Dump the database
  const dbUrlRaw = process.env.DATABASE_URL;
  if (!dbUrlRaw) {
    console.error("❌ DATABASE_URL is not set.");
    return;
  }
  
  // pg_dump does not support Prisma's ?schema=public URL parameter
  const dbUrl = dbUrlRaw.split('?')[0];
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `gw2_alliance_backup_${timestamp}.sql`;
  const dumpPath = path.join('/tmp', filename);
  
  console.log("💾 Running pg_dump...");
  try {
    // --clean drops the DB items before recreating them if restored.
    // Format is plain SQL but could be custom. Plain text is easiest to read.
    await execAsync(`pg_dump --clean "${dbUrl}" > ${dumpPath}`);
  } catch (e: any) {
    console.error("❌ pg_dump failed:", e.message);
    if (fs.existsSync(dumpPath)) fs.unlinkSync(dumpPath);
    return;
  }
  
  // 3. Upload to Google Drive
  console.log(`☁️ Uploading ${filename} to Google Drive...`);
  try {
    const uploadRes = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [targetFolderId!],
      },
      media: {
        mimeType: 'application/x-sql',
        body: fs.createReadStream(dumpPath),
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    console.log(`✅ Upload successful: ${uploadRes.data.id}`);
  } catch (e: any) {
    console.error("❌ Google Drive Upload failed:", e.message);
  } finally {
    if (fs.existsSync(dumpPath)) fs.unlinkSync(dumpPath);
  }
  
  // 4. Implement Retention Strategy (delete old backups)
  console.log(`🧹 Checking retention (Max: ${MAX_BACKUPS})...`);
  try {
    const filesList = await drive.files.list({
      q: `'${targetFolderId}' in parents and trashed=false and name contains 'gw2_alliance_backup'`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    const backups = filesList.data.files || [];
    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      for (const oldBackup of toDelete) {
        console.log(`🗑️ Deleting old backup: ${oldBackup.name}`);
        await drive.files.delete({ fileId: oldBackup.id!, supportsAllDrives: true });
      }
    } else {
      console.log(`ℹ️ Retention check passed. Total backups: ${backups.length}/${MAX_BACKUPS}.`);
    }
  } catch (e: any) {
    console.error("❌ Failed during retention cleanup:", e.message);
  }
}
