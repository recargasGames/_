import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Login
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
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "perfil.html";
        } catch (error) {
            if (error.code === 'auth/invalid-credential') {
                errorMsg.textContent = "❌ Usuario o contraseña incorrectos";
            } else if (error.code === 'auth/user-not-found') {
                errorMsg.textContent = "❌ Usuario no encontrado. Regístrate primero";
            } else if (error.code === 'auth/too-many-requests') {
                errorMsg.textContent = "❌ Demasiados intentos. Intenta más tarde";
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

// Recuperar contraseña
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