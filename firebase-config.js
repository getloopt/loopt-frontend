// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import dotenv from "dotenv";
import { getFirestore } from "firebase/firestore";

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

// Set persistence immediately
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase persistence initialized");
  })
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

// Test if Firebase is connected properly
try {
  console.log("Initializing Firebase...");
  console.log("Firebase config:", firebaseConfig);
  console.log(auth)
} catch (error) {
  console.error("Error initializing Firebase:", error);
  console.log("Firebase config:", firebaseConfig);
}

export { app, auth, db };