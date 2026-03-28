// cron.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Wir erfordern die Methode über require, weil sie TS kompiliert ist.
// In Next.js App Router (tsconfig -> module: next) werden Backend Library Module 
// am besten direkt aus ts-node oder tsx aufgerufen, wenn sie außerhalb von Next.js laufen.
// Weil unser Command "npm run dev" benutzt, kompiliert es NextJS on the fly, 
// für cron.js benötigen wir daher einen ts-node / tsx wrapper oder müssen die gw2api direkt hier duplizieren/ausführen.
// Da wir "tsx" / "ts-node" evtl nicht in package.json haben, schreiben wir die Logik minimal in reinem JS nach, ODER nutzen tsx:
// Alternativ: Da cron.js in "docker-compose" ohnehin mit "npx tsx cron.ts" ausgeführt werden sollte, 
// schreiben wir lieber ein cron.ts und kompilieren on-the-fly.

const { syncAllGuildRosters } = require('./lib/gw2api.js'); 
// Aber lib/gw2api ist TS!
