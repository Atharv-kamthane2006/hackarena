import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDummyKeyForInit",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "locker-c5949.firebaseapp.com",
  databaseURL:
    process.env.REACT_APP_FIREBASE_DATABASE_URL ||
    "https://locker-c5949-default-rtdb.firebaseio.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "locker-c5949",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "locker-c5949.appspot.com",
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:000000000000:web:dummyappid"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
