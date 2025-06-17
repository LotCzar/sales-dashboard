import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBT_0C2GRh-JZ0Xb5cHEn7pMv1DGQi8dxE",
  authDomain: "sell-it-pinesny.firebaseapp.com",
  projectId: "sell-it-pinesny",
  storageBucket: "sell-it-pinesny.appspot.com",
  messagingSenderId: "515475349801",
  appId: "1:515475349801:web:bbec06f61b568bd2951738"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
