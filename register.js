import { auth } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const form = document.getElementById("registerForm");
form.addEventListener("submit", async(e) => {
    e.preventDefault();
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("✅ Cuenta creada exitosamente. Ahora inicia sesión.");
        window.location.href = "login.html";
    } catch(error) {
        if(error.code === 'auth/email-already-in-use') {
            alert("❌ Este correo ya está registrado");
        } else if(error.code === 'auth/weak-password') {
            alert("❌ La contraseña debe tener al menos 6 caracteres");
        } else {
            alert("❌ Error: " + error.message);
        }
    }
});

