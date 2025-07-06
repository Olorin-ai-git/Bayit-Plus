// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { enableAnalytics } from "./config/environment";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics with error handling and environment check
let analytics: Analytics | null = null;
try {
  // Only initialize analytics in the browser environment and when enabled
  if (typeof window !== 'undefined' && enableAnalytics) {
    analytics = getAnalytics(app);
    console.log('🔥 Firebase Analytics initialized successfully');
  } else if (!enableAnalytics) {
    console.log('📊 Firebase Analytics disabled by environment configuration');
  }
} catch (error) {
  console.warn('Firebase Analytics initialization failed:', error);
}

export { app, analytics }; 