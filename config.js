import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

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
export const db = getDatabase(app);

