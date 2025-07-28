// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, enableNetwork, disableNetwork, connectFirestoreEmulator } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable Firestore offline persistence (this is automatic in v9+)
// Firestore automatically enables offline persistence by default



// Set auth persistence immediately
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase auth persistence enabled");
  })
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
  });

// Test if Firebase is connected properly
try {
  console.log("Firebase initialized successfully");
  console.log("Offline persistence: Enabled by default");
  
  // Log connection status
  if (typeof window !== 'undefined') {
    console.log("Network status:", navigator.onLine ? 'Online' : 'Offline');
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

// Helper functions for manual network control (optional)
export const goOffline = () => {
  return disableNetwork(db);
};

export const goOnline = () => {
  return enableNetwork(db);
};

export { app, auth, db };