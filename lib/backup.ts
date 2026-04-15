import { google } from 'googleapis';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = util.promisify(exec);

const FOLDER_NAME = 'GW2 Backups';
const MAX_BACKUPS = process.env.MAX_BACKUPS ? parseInt(process.env.MAX_BACKUPS) : 4;

export async function runDatabaseBackup() {
  console.log("🔒 Starting automated Database Backup...");

  const base64Auth = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  if (!base64Auth) {
    console.log("ℹ️ GOOGLE_SERVICE_ACCOUNT_BASE64 is missing. Backup skipped.");
    return;
  }

  let credentials;
  try {
    credentials = JSON.parse(Buffer.from(base64Auth, 'base64').toString('utf-8'));
  } catch (e: any) {
    console.error("❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_BASE64 as JSON.");
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'], // Full drive access is recommended to find the user's shared folder
  });

  const drive = google.drive({ version: 'v3', auth });
  
  // 1. Find or Use Target Folder
  let targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;
  
  if (!targetFolderId) {
    try {
      const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });
      
      if (res.data.files && res.data.files.length > 0) {
        targetFolderId = res.data.files[0].id!;
      } else {
        // Fallback: Create folder (it will be isolated in the Service Account's own drive unless shared back)
        const folderRes = await drive.files.create({
          requestBody: {
            name: FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
          },
          fields: 'id',
        });
        targetFolderId = folderRes.data.id!;
        console.log(`📁 Target folder not found. Created Service-Account-owned Folder id: ${targetFolderId}`);
      }
    } catch (e: any) {
      console.error("❌ Failed to find or create Google Drive Folder:", e.message);
      return;
    }
  }

  // 2. Dump the database
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not set.");
    return;
  }
  
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
    });
    
    const backups = filesList.data.files || [];
    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      for (const oldBackup of toDelete) {
        console.log(`🗑️ Deleting old backup: ${oldBackup.name}`);
        await drive.files.delete({ fileId: oldBackup.id! });
      }
    } else {
      console.log(`ℹ️ Retention check passed. Total backups: ${backups.length}/${MAX_BACKUPS}.`);
    }
  } catch (e: any) {
    console.error("❌ Failed during retention cleanup:", e.message);
  }
}
