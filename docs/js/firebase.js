import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyDf82k9aGxzZnrLyXr3cDFfUaM95qdBpb8",
  authDomain: "cp-tracker-f23a6.firebaseapp.com",
  databaseURL: "https://cp-tracker-f23a6-default-rtdb.firebaseio.com",
  projectId: "cp-tracker-f23a6",
  storageBucket: "cp-tracker-f23a6.firebasestorage.app",
  messagingSenderId: "837086298943",
  appId: "1:837086298943:web:c88aec4567e693ae65898a",
  measurementId: "G-J1YL7WJ94W"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);