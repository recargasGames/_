import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// Inicializar la App de Firebase
const app = initializeApp(firebaseConfig);

// Exportar la autenticación para usarla en otras páginas
export const auth = getAuth(app);
