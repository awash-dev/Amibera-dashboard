import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; 

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCBwbj250hdrw4MCMPhGJW6SpXdJfF62Go",
    authDomain: "otp-3217a.firebaseapp.com",
    projectId: "otp-3217a",
    storageBucket: "otp-3217a.appspot.com",
    messagingSenderId: "957646514448",
    appId: "1:957646514448:web:62b3f71bbc18ccc20b1d95",
    measurementId: "G-P46577W2VM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const FIREBASE_Auth = getAuth(app);
const FIREBASE_Db = getFirestore(app);
const FIREBASE_Storage = getStorage(app); 

export { FIREBASE_Auth, FIREBASE_Db, FIREBASE_Storage }; // Export analytics