import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDyo-HiGfO0IcRret7AgHj4dlU4j0PVlq0",
    authDomain: "recargasgames-14c38.firebaseapp.com",
    databaseURL: "https://recargasgames-14c38-default-rtdb.firebaseio.com",
    projectId: "recargasgames-14c38",
    storageBucket: "recargasgames-14c38.firebasestorage.app",
    messagingSenderId: "370952235234",
    appId: "1:370952235234:web:41a9ebd7084f1955a256bb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const form = document.getElementById("registerForm");
const errorMsg = document.getElementById("errorMsg");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById("nombre").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        
        errorMsg.style.display = "none";
        
        if (!nombre || !email || !password || !confirmPassword) {
            errorMsg.textContent = "❌ Completa todos los campos";
            errorMsg.style.display = "block";
            return;
        }
        
        if (password !== confirmPassword) {
            errorMsg.textContent = "❌ Las contraseñas no coinciden";
            errorMsg.style.display = "block";
            return;
        }
        
        if (password.length < 6) {
            errorMsg.textContent = "❌ La contraseña debe tener al menos 6 caracteres";
            errorMsg.style.display = "block";
            return;
        }
        
        const btn = document.querySelector("button[type='submit']");
        btn.textContent = "Registrando...";
        btn.disabled = true;
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await updateProfile(user, { displayName: nombre });
            
            // Guardar usuario en Realtime Database
            const userRef = ref(db, 'usuarios/' + user.uid);
            await set(userRef, {
                uid: user.uid,
                email: email,
                nombre: nombre,
                fecha: new Date().toLocaleString(),
                timestamp: Date.now()
            });
            
            alert("✅ Cuenta creada exitosamente");
            window.location.href = "login.html";
            
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                errorMsg.textContent = "❌ Este correo ya está registrado";
            } else if (error.code === 'auth/weak-password') {
                errorMsg.textContent = "❌ Contraseña demasiado débil";
            } else if (error.code === 'auth/invalid-email') {
                errorMsg.textContent = "❌ Correo electrónico inválido";
            } else {
                errorMsg.textContent = "❌ Error: " + error.message;
            }
            errorMsg.style.display = "block";
            btn.textContent = "Registrarme";
            btn.disabled = false;
        }
    });
}