import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const form = document.getElementById("loginForm");
form.addEventListener("submit", async(e) => {
    e.preventDefault();
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("✅ Bienvenido a RECARGASGAMES");
        window.location.href = "index.html";
    } catch(error) {
        if(error.code === 'auth/invalid-credential') {
            alert("❌ Correo o contraseña incorrectos");
        } else if(error.code === 'auth/too-many-requests') {
            alert("❌ Demasiados intentos. Intenta más tarde");
        } else {
            alert("❌ Error: " + error.message);
        }
    }
});

