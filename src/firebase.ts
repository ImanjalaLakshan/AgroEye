import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCiPMoWXVflH6JkVjqoemEbt1UmowEtQJ0",
  authDomain: "smart-paddy-9445b.firebaseapp.com",
  databaseURL: "https://smart-paddy-9445b-default-rtdb.firebaseio.com",
  projectId: "smart-paddy-9445b",
  storageBucket: "smart-paddy-9445b.firebasestorage.app",
  messagingSenderId: "438253880604",
  appId: "1:438253880604:web:02090d990a9ca11d23a6d9"
};

// Main Firebase App
const app = initializeApp(firebaseConfig);

// Secondary Firebase App
const secondaryApp = initializeApp(firebaseConfig, "Secondary");

// Realtime Database
export const db = getDatabase(app);

// Main Authentication
export const auth = getAuth(app);

// Google Login
export const googleProvider = new GoogleAuthProvider();

// Secondary Authentication
export const secondaryAuth = getAuth(secondaryApp);