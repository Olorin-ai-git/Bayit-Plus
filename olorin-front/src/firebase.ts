// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { enableAnalytics } from "./config/environment";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBufhVVelL85FS80dFwAyVaVh5QxxfWqkU",
  authDomain: "olorin-ai.firebaseapp.com",
  projectId: "olorin-ai",
  storageBucket: "olorin-ai.firebasestorage.app",
  messagingSenderId: "682679371769",
  appId: "1:682679371769:web:62f74c16fb93d50a951f28",
  measurementId: "G-HM69PZF9QE"
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