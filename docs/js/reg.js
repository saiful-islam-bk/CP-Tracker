import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

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

import {
    getAuth,
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById("regform").addEventListener("submit", async (e) => {

    e.preventDefault();
    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    alert("kire");
    if (!fullname || !email || !password || !confirmPassword) {
        alert("Please fill all fields.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    try {

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;

        // Firebase Auth profile-এ নাম সংরক্ষণ
        await updateProfile(user, {
            displayName: fullname
        });

        // Firestore-এ অতিরিক্ত তথ্য সংরক্ষণ
        await setDoc(doc(db, "users", user.uid), {
            fullName: fullname,
            email: email,
            codeforces: "",
            atcoder: "",
            codechef: "",
            createdAt: serverTimestamp()
        });

        alert("Account created successfully!");

        window.location.href = "login.html";

    } catch (error) {

        alert(error.message);

    }

});