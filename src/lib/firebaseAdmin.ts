import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import  admin  from 'firebase-admin';
import { createRequire } from 'module';


// Set up require for JSON import
const require = createRequire(import.meta.url);
// Import the service account file using require
const serviceAccount={
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_AUTH_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
}

let adminDB;

console.log(serviceAccount);

try {
  console.log('Initializing Firebase Admin...');

  if (!getApps().length) {
    initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
    });
  }
  
  adminDB = getFirestore();
  console.log('Firebase Admin initialized successfully');

} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  throw error;
}

export { adminDB };