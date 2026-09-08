// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAARiBZAruTMx2anfq6nCn61SKhXYsyL5w",
  authDomain: "free-52119.firebaseapp.com",
  databaseURL: "https://free-52119-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "free-52119",
  storageBucket: "free-52119.firebasestorage.app",
  messagingSenderId: "632240144599",
  appId: "1:632240144599:web:e31c25665ffe19c194b092",
  measurementId: "G-5NLLLEPWPK"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export { auth, db, rtdb };
