import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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
const auth = getAuth(app);

document.getElementById("loginform").addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("rememberMe").checked;

    try {

        await setPersistence(
            auth,
            rememberMe
                ? browserLocalPersistence
                : browserSessionPersistence
        );

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        alert("Login Successful!");

        window.location.href = "profile.html";

    }
    catch (error) {

        switch (error.code) {

            case "auth/invalid-credential":
                alert("Invalid email or password.");
                break;

            case "auth/invalid-email":
                alert("Invalid email.");
                break;

            case "auth/too-many-requests":
                alert("Too many failed attempts. Please try again later.");
                break;

            default:
                alert(error.message);

        }

    }

});