import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      // Local development with emulator
      admin.initializeApp({
        projectId: 'gw2-alliance-manager',
      });
      console.log('Firebase Admin initialized for Emulator');
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID) {
      // Local or specific production with real keys
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      });
      console.log('Firebase Admin initialized for Production (Explicit Keys)');
    } else {
      // App Hosting / Cloud Build automatically provides Default Credentials
      admin.initializeApp();
      console.log('Firebase Admin initialized with Application Default Credentials');
    }
    
    // Enable ignoring undefined properties globally
    admin.firestore().settings({
      ignoreUndefinedProperties: true,
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export const firestore = admin.firestore;
