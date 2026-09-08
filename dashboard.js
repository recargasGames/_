// dashboard.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

export function initDashboard() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        // Actualizar UI con datos del usuario
        document.getElementById('userName').textContent = user.displayName || 'Usuario';
        document.getElementById('userEmail').textContent = user.email;
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'login.html';
    });
}
