import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDhaES2k1M9ZXqy6u04FO1Xkobs-bOEIA0",
  authDomain: "pocketcare-personalcare.firebaseapp.com",
  projectId: "pocketcare-personalcare",
  storageBucket: "pocketcare-personalcare.appspot.com",
  messagingSenderId: "744023236008",
  appId: "1:744023236008:web:985106624fc8e0e45b919d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
 