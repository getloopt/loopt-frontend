import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import  admin  from 'firebase-admin';
import { createRequire } from 'module';


// Set up require for JSON import
const require = createRequire(import.meta.url);
// Import the service account file using require
const serviceAccount = require('./college-app-f24d8-firebase-adminsdk-fbsvc-9e2e1d53f8.json');

let adminDB;

try {
  console.log('Initializing Firebase Admin...');

  if (!getApps().length) {
    initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  adminDB = getFirestore();
  console.log('Firebase Admin initialized successfully');

} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  throw error;
}

export { adminDB };