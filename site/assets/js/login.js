import { auth, db, COL_ADMINS } from './firebase.js';
import {
  signInWithEmailAndPassword, updatePassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toast, REGRAS_SENHA, validarSenhaForte, comCarregamento } from './utils.js';

const viewLogin = document.getElementById('viewLogin');
const viewTroca = document.getElementById('viewTrocarSenha');
const novaSenhaEl = document.getElementById('novaSenha');
const novaSenha2El = document.getElementById('novaSenha2');
const btnEntrar = document.getElementById('btnEntrar');
const btnSalvarSenha = document.getElementById('btnSalvarSenha');

btnEntrar.addEventListener('click', () => comCarregamento(btnEntrar, entrar));
document.getElementById('senha').addEventListener('keydown', e => { if (e.key === 'Enter') comCarregamento(btnEntrar, entrar); });
btnSalvarSenha.addEventListener('click', () => comCarregamento(btnSalvarSenha, salvarSenha));

// ---- Regras de senha (lista visual + validação ao vivo) ----
const listaRegras = document.getElementById('regrasSenha');
REGRAS_SENHA.forEach(r => {
  const li = document.createElement('li');
  li.dataset.id = r.id;
  li.textContent = r.txt;
  listaRegras.appendChild(li);
});
novaSenhaEl.addEventListener('input', avaliarSenha);
novaSenha2El.addEventListener('input', avaliarSenha);

function avaliarSenha(){
  const s = novaSenhaEl.value;
  let todasOk = true;
  REGRAS_SENHA.forEach(r => {
    const li = listaRegras.querySelector(`[data-id="${r.id}"]`);
    const ok = r.teste(s);
    li.classList.toggle('ok', ok);
    if (!ok) todasOk = false;
  });
  const confereMatch = s.length > 0 && s === novaSenha2El.value;
  btnSalvarSenha.disabled = !(todasOk && confereMatch);
}

async function entrar(){
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  if (!email || !senha){ toast('Informe e-mail e senha.', 'warn'); return; }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    // confere se é um admin cadastrado
    const snap = await getDoc(doc(db, COL_ADMINS, cred.user.uid));
    if (!snap.exists()){
      await signOut(auth);
      toast('Este usuário não tem permissão de administrador.', 'erro', 6000);
      return;
    }
    const adm = snap.data();
    if (adm.mustChangePassword){
      // força a troca de senha no primeiro acesso
      viewLogin.classList.add('hidden');
      viewTroca.classList.remove('hidden');
      viewTroca.classList.add('fade-in');
      return;
    }
    location.href = './admin.html';
  } catch (e){
    console.error(e);
    const map = {
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.'
    };
    toast(map[e.code] || 'Não foi possível entrar. Verifique os dados.', 'erro');
  }
}

async function salvarSenha(){
  const s1 = novaSenhaEl.value;
  const s2 = novaSenha2El.value;
  const { ok, faltas } = validarSenhaForte(s1);
  if (!ok){ toast('Senha fraca. Falta: ' + faltas.map(f => f.txt.toLowerCase()).join('; '), 'warn', 6000); return; }
  if (s1 !== s2){ toast('As senhas não conferem.', 'warn'); return; }

  try {
    await updatePassword(auth.currentUser, s1);
    await updateDoc(doc(db, COL_ADMINS, auth.currentUser.uid), { mustChangePassword: false });
    toast('Senha atualizada com sucesso!', 'ok');
    location.href = './admin.html';
  } catch (e){
    console.error(e);
    toast('Erro ao salvar a senha. Faça login novamente e tente de novo.', 'erro', 6000);
  }
}
