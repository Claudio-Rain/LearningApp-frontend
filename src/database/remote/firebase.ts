import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCMwyu5jelRDJ39rEeq0_huAntu52ne8EQ",
  authDomain: "learningapp-f7d22.firebaseapp.com",
  projectId: "learningapp-f7d22",
  storageBucket: "learningapp-f7d22.firebasestorage.app",
  messagingSenderId: "89331298111",
  appId: "1:89331298111:web:91475d009ad1af427a2d8a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app)