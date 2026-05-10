import * as fs from 'fs';
import * as path from 'path';

const backupPath = path.join(process.cwd(), "backup.json");
const content = fs.readFileSync(backupPath, 'utf8');
const backup = JSON.parse(content);
console.log(JSON.stringify(backup.collections.members.slice(0, 2), null, 2));
