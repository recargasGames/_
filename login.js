import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, update, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

// ========== LOGIN ==========
const loginBtn = document.getElementById("loginBtn");
const errorMsg = document.getElementById("errorMsg");

if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
        errorMsg.style.display = "none";
        
        let usuario = document.getElementById("usuario").value.trim();
        const password = document.getElementById("password").value;
        let email = usuario;
        
        if (!usuario || !password) {
            errorMsg.textContent = "❌ Completa todos los campos";
            errorMsg.style.display = "block";
            return;
        }
        
        loginBtn.textContent = "Ingresando...";
        loginBtn.disabled = true;
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Actualizar última conexión en la base de datos
            const userRef = ref(db, 'usuarios/' + user.uid);
            const snapshot = await get(userRef);
            if(snapshot.exists()){
                await update(userRef, {
                    ultima_conexion: new Date().toLocaleString(),
                    ultimo_login: Date.now()
                });
            }
            
            window.location.href = "perfil.html";
        } catch (error) {
            if (error.code === 'auth/invalid-credential') {
                errorMsg.textContent = "❌ Usuario o contraseña incorrectos";
            } else if (error.code === 'auth/user-not-found') {
                errorMsg.textContent = "❌ Usuario no encontrado. Regístrate primero";
            } else if (error.code === 'auth/too-many-requests') {
                errorMsg.textContent = "❌ Demasiados intentos. Intenta más tarde";
            } else if (error.code === 'auth/invalid-email') {
                errorMsg.textContent = "❌ Correo electrónico inválido";
            } else {
                errorMsg.textContent = "❌ Error: " + error.message;
            }
            errorMsg.style.display = "block";
        } finally {
            loginBtn.textContent = "Iniciar Sesión";
            loginBtn.disabled = false;
        }
    });
    
    document.getElementById("password").addEventListener("keypress", (e) => {
        if (e.key === "Enter") loginBtn.click();
    });
}

// ========== RECUPERAR CONTRASEÑA ==========
window.abrirModalRecuperar = () => {
    document.getElementById("modalRecuperar").style.display = "flex";
    document.getElementById("resetEmail").value = "";
    document.getElementById("resetMsg").style.display = "none";
    document.getElementById("resetSpinner").style.display = "none";
    document.getElementById("infoBox").style.display = "none";
};

window.cerrarModalRecuperar = () => {
    document.getElementById("modalRecuperar").style.display = "none";
};

window.enviarRecuperacion = async () => {
    const email = document.getElementById("resetEmail").value.trim();
    const resetMsg = document.getElementById("resetMsg");
    const spinner = document.getElementById("resetSpinner");
    const infoBox = document.getElementById("infoBox");
    const btnEnviar = document.querySelector(".modal-buttons button:first-child");
    
    if (!email) {
        resetMsg.textContent = "❌ Ingresa tu correo electrónico";
        resetMsg.style.color = "#ef4444";
        resetMsg.style.display = "block";
        infoBox.style.display = "none";
        return;
    }
    
    spinner.style.display = "block";
    btnEnviar.disabled = true;
    resetMsg.style.display = "none";
    infoBox.style.display = "none";
    
    try {
        await sendPasswordResetEmail(auth, email);
        spinner.style.display = "none";
        btnEnviar.disabled = false;
        resetMsg.style.display = "none";
        infoBox.style.display = "block";
        
        setTimeout(() => cerrarModalRecuperar(), 5000);
    } catch (error) {
        spinner.style.display = "none";
        btnEnviar.disabled = false;
        
        if (error.code === 'auth/user-not-found') {
            resetMsg.innerHTML = "❌ No existe una cuenta con este correo electrónico.";
            resetMsg.style.color = "#ef4444";
        } else if (error.code === 'auth/invalid-email') {
            resetMsg.textContent = "❌ Correo electrónico inválido";
            resetMsg.style.color = "#ef4444";
        } else {
            resetMsg.textContent = "❌ Error: " + error.message;
            resetMsg.style.color = "#ef4444";
        }
        resetMsg.style.display = "block";
        infoBox.style.display = "none";
    }
};

window.onclick = (event) => {
    const modal = document.getElementById("modalRecuperar");
    if (event.target === modal) cerrarModalRecuperar();
};

// ========== VERIFICAR SESIÓN ACTIVA ==========
onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.includes("login.html")) {
        // Si ya está logueado y está en login, redirigir a perfil
        window.location.href = "perfil.html";
    }
});