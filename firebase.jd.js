import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDyo-HiGfO0IcRret7AgHj4dlU4j0PVlq0",
    authDomain: "recargasgames-14c38.firebaseapp.com",
    projectId: "recargasgames-14c38",
    storageBucket: "recargasgames-14c38.firebasestorage.app",
    messagingSenderId: "370952235234",
    appId: "1:370952235234:web:41a9ebd7084f1955a256bb",
    measurementId: "G-60Z9EGJZKL",
    databaseURL: "https://recargasgames-14c38-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

