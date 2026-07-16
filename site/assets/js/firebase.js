// Inicialização do Firebase (SDK modular via CDN).
// As chaves abaixo já são as do projeto "paroquia-beruri".
// Instruções completas em SETUP-FIREBASE.md
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyA7hy862b__57oQh8ZVwTgs1q2DY67hEVQ",
  authDomain: "paroquia-beruri.firebaseapp.com",
  projectId: "paroquia-beruri",
  storageBucket: "paroquia-beruri.firebasestorage.app",
  messagingSenderId: "1000839358332",
  appId: "1:1000839358332:web:3495a5381b5ec8742ae6f9"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Documento único com as listas usadas no formulário e nas configurações.
export const CONFIG_DOC = ["config", "listas"];
// Coleção de cadastros (id do documento = CPF só com dígitos).
export const COL_CADASTROS = "cadastros";
// Coleção de administradores (id do documento = uid do Auth).
export const COL_ADMINS = "admins";
// Coleção de histórico/auditoria das ações dos administradores.
export const COL_ATIVIDADES = "atividades";
