import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      // Local development with emulator
      admin.initializeApp({
        projectId: 'gw2-alliance-manager',
      });
      console.log('Firebase Admin initialized for Emulator');
    } else {
      // Production or local with real keys
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      });
      console.log('Firebase Admin initialized for Production');
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
