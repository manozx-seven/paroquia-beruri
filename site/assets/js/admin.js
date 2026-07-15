import { app, auth, db, firebaseConfig, COL_CADASTROS, COL_ADMINS, CONFIG_DOC } from './firebase.js';
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  onAuthStateChanged, signOut, getAuth,
  createUserWithEmailAndPassword, signOut as signOutApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  formatarCPF, dataBR, toast, preencherSelect, onlyDigits
} from './utils.js';

let MEU = { uid: null, email: null, role: null };
let LISTAS = { comunidades: [], pastorais: [], funcoes: [] };
let CADASTROS = []; // {id, ...dados}

const $ = (s) => document.querySelector(s);
const carregando = $('#carregando');

// ---------- Guarda de acesso ----------
onAuthStateChanged(auth, async (user) => {
  if (!user){ location.href = './login.html'; return; }
  try {
    const snap = await getDoc(doc(db, COL_ADMINS, user.uid));
    if (!snap.exists()){ await signOut(auth); location.href = './login.html'; return; }
    const adm = snap.data();
    if (adm.mustChangePassword){ location.href = './login.html'; return; }
    MEU = { uid: user.uid, email: user.email, role: adm.role || 'adm' };
    $('#quemSou').innerHTML = `${MEU.email} <span class="badge ${MEU.role}">${MEU.role === 'dev' ? 'DEV' : 'ADM'}</span>`;
    await carregarTudo();
  } catch (e){
    console.error(e); toast('Erro ao carregar o painel.', 'erro');
  }
});

$('#btnSair').addEventListener('click', async () => { await signOut(auth); location.href = './index.html'; });

// ---------- Abas ----------
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  document.querySelectorAll('.tabpane').forEach(p => p.classList.add('hidden'));
  $('#tab-' + t.dataset.tab).classList.remove('hidden');
}));

async function carregarTudo(){
  carregando.classList.add('show');
  await Promise.all([carregarListas(), carregarCadastros(), carregarAdmins()]);
  carregando.classList.remove('show');
  $('#tab-cadastros').classList.remove('hidden');
}

// ---------- Listas / Configurações ----------
async function carregarListas(){
  const snap = await getDoc(doc(db, CONFIG_DOC[0], CONFIG_DOC[1]));
  if (snap.exists()) LISTAS = Object.assign({ comunidades: [], pastorais: [], funcoes: [] }, snap.data());
  renderConfig();
  // filtro por comunidade
  preencherSelect($('#filtroComunidade'), LISTAS.comunidades, { placeholder: 'Todas as comunidades' });
  $('#filtroComunidade').querySelector('option').disabled = false;
}

function renderConfig(){
  renderChips('#listaComunidades', 'comunidades');
  renderChips('#listaPastorais', 'pastorais');
  renderChips('#listaFuncoes', 'funcoes');
}

function renderChips(sel, chave){
  const box = $(sel); box.innerHTML = '';
  (LISTAS[chave] || []).forEach((item, i) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    const txt = document.createElement('span');
    txt.textContent = item;
    txt.title = 'Clique para renomear';
    txt.style.cursor = 'pointer';
    txt.addEventListener('click', () => editarItem(chave, i));
    const x = document.createElement('button');
    x.textContent = '×'; x.title = 'Remover';
    x.addEventListener('click', () => removerItem(chave, i));
    chip.append(txt, x);
    box.appendChild(chip);
  });
}

document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
  const chave = b.dataset.add;
  const map = { comunidades: '#novaComunidade', pastorais: '#novaPastoral', funcoes: '#novaFuncao' };
  const input = $(map[chave]);
  const val = input.value.trim();
  if (!val) return;
  if ((LISTAS[chave] || []).includes(val)){ toast('Este item já existe.', 'warn'); return; }
  LISTAS[chave] = [...(LISTAS[chave] || []), val];
  input.value = '';
  salvarListas();
}));

function editarItem(chave, i){
  const atual = LISTAS[chave][i];
  const novo = (prompt(`Renomear "${atual}" para:`, atual) || '').trim();
  if (!novo || novo === atual) return;
  LISTAS[chave][i] = novo;
  salvarListas();
}
function removerItem(chave, i){
  if (!confirm(`Remover "${LISTAS[chave][i]}"?`)) return;
  LISTAS[chave].splice(i, 1);
  salvarListas();
}
async function salvarListas(){
  try {
    await setDoc(doc(db, CONFIG_DOC[0], CONFIG_DOC[1]), LISTAS, { merge: true });
    renderConfig();
    preencherSelect($('#filtroComunidade'), LISTAS.comunidades, { placeholder: 'Todas as comunidades' });
    $('#filtroComunidade').querySelector('option').disabled = false;
    toast('Configurações salvas.', 'ok');
  } catch (e){ console.error(e); toast('Erro ao salvar. Verifique sua permissão.', 'erro'); }
}

// ---------- Cadastros ----------
async function carregarCadastros(){
  const qs = await getDocs(collection(db, COL_CADASTROS));
  CADASTROS = qs.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  renderCadastros();
}

$('#filtro').addEventListener('input', renderCadastros);
$('#filtroComunidade').addEventListener('change', renderCadastros);

function renderCadastros(){
  const raw = $('#filtro').value.trim().toLowerCase();
  const dig = onlyDigits($('#filtro').value);
  const comFiltro = $('#filtroComunidade').value;
  const box = $('#listaCadastros'); box.innerHTML = '';

  const filtrados = CADASTROS.filter(c => {
    if (comFiltro && c.comunidade !== comFiltro) return false;
    if (!raw) return true;
    const porNome = (c.nome || '').toLowerCase().includes(raw);
    const porCom = (c.comunidade || '').toLowerCase().includes(raw);
    const porCpf = dig.length > 0 && c.id.includes(dig);
    return porNome || porCom || porCpf;
  });

  $('#contadorCadastros').textContent = `${filtrados.length} cadastro(s).`;
  filtrados.forEach(c => {
    const past = (c.pastorais || []).map(p => `${p.nome} (${p.funcao})`).join(', ') || '—';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="topbar">
        <h4 style="margin:0">${c.nome || '(sem nome)'}</h4>
        <div>
          <button class="btn-sm btn-ghost" data-edit="${c.id}">Editar</button>
          <button class="btn-sm btn-danger" data-del="${c.id}">Excluir</button>
        </div>
      </div>
      <p class="muted" style="margin:4px 0">
        <strong>CPF:</strong> ${formatarCPF(c.id)} &nbsp;•&nbsp;
        <strong>Cel:</strong> ${c.celular || '—'} &nbsp;•&nbsp;
        <strong>Nasc.:</strong> ${dataBR(c.nascimento)}</p>
      <p style="margin:4px 0"><strong>${c.comunidade || '—'}</strong> — ${c.funcaoComunidade || '—'}</p>
      <p style="margin:4px 0"><strong>Pastorais:</strong> ${past}</p>`;
    box.appendChild(card);
  });

  box.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => abrirEdicao(b.dataset.edit)));
  box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => excluirCadastro(b.dataset.del)));
}

async function excluirCadastro(id){
  const c = CADASTROS.find(x => x.id === id);
  if (!confirm(`Excluir o cadastro de ${c?.nome || formatarCPF(id)}?`)) return;
  try {
    await deleteDoc(doc(db, COL_CADASTROS, id));
    CADASTROS = CADASTROS.filter(x => x.id !== id);
    renderCadastros();
    toast('Cadastro excluído.', 'ok');
  } catch (e){ console.error(e); toast('Erro ao excluir.', 'erro'); }
}

// ---- Modal de edição ----
const modal = $('#modal');
let editId = null;
$('#modalCancelar').addEventListener('click', () => modal.classList.add('hidden'));

function abrirEdicao(id){
  const c = CADASTROS.find(x => x.id === id); if (!c) return;
  editId = id;
  $('#modalTitulo').textContent = `Editar: ${c.nome || formatarCPF(id)}`;
  $('#modalCorpo').innerHTML = `
    <label>Nome<input id="mNome" type="text" value="${(c.nome || '').replace(/"/g, '&quot;')}"></label>
    <label>CPF<input type="text" value="${formatarCPF(id)}" disabled></label>
    <div class="row">
      <label>Celular<input id="mCelular" type="text" value="${c.celular || ''}"></label>
      <label>Nascimento<input id="mNasc" type="date" value="${c.nascimento || ''}"></label>
    </div>
    <label>Comunidade<select id="mComunidade"></select></label>
    <label>Função na Comunidade<select id="mFuncaoCom"></select></label>
    <h4 style="margin-bottom:0">Pastorais / Grupos</h4>
    <div id="mPastorais"></div>
    <button type="button" class="btn-ghost btn-sm mt" id="mAddPast">+ Adicionar pastoral</button>`;

  preencherSelect($('#mComunidade'), LISTAS.comunidades);
  preencherSelect($('#mFuncaoCom'), LISTAS.funcoes);
  $('#mComunidade').value = c.comunidade || '';
  $('#mFuncaoCom').value = c.funcaoComunidade || '';

  const wrap = $('#mPastorais');
  (c.pastorais && c.pastorais.length ? c.pastorais : [{ nome: '', funcao: '' }]).forEach(p => addLinhaPastoral(wrap, p));
  $('#mAddPast').addEventListener('click', () => addLinhaPastoral(wrap, { nome: '', funcao: '' }));

  modal.classList.remove('hidden');
}

function addLinhaPastoral(wrap, p){
  const div = document.createElement('div');
  div.className = 'pastoral-bloco';
  const selP = document.createElement('select'); selP.className = 'mPast';
  const selF = document.createElement('select'); selF.className = 'mFunc';
  preencherSelect(selP, LISTAS.pastorais); preencherSelect(selF, LISTAS.funcoes);
  selP.value = p.nome || ''; selF.value = p.funcao || '';
  const rm = document.createElement('button');
  rm.type = 'button'; rm.className = 'btn-danger btn-sm'; rm.textContent = 'Remover'; rm.style.marginTop = '8px';
  rm.addEventListener('click', () => div.remove());
  const l1 = document.createElement('label'); l1.textContent = 'Pastoral / Grupo';
  const l2 = document.createElement('label'); l2.textContent = 'Função';
  div.append(l1, selP, l2, selF, rm);
  wrap.appendChild(div);
}

$('#modalSalvar').addEventListener('click', async () => {
  if (!editId) return;
  const pastorais = [...$('#mPastorais').querySelectorAll('.pastoral-bloco')].map(b => ({
    nome: b.querySelector('.mPast').value,
    funcao: b.querySelector('.mFunc').value
  })).filter(p => p.nome);

  const dados = {
    nome: $('#mNome').value.trim(),
    celular: $('#mCelular').value,
    nascimento: $('#mNasc').value,
    comunidade: $('#mComunidade').value,
    funcaoComunidade: $('#mFuncaoCom').value,
    pastorais,
    atualizadoEm: serverTimestamp()
  };
  try {
    await updateDoc(doc(db, COL_CADASTROS, editId), dados);
    const i = CADASTROS.findIndex(x => x.id === editId);
    if (i >= 0) CADASTROS[i] = { ...CADASTROS[i], ...dados };
    modal.classList.add('hidden');
    renderCadastros();
    toast('Cadastro atualizado.', 'ok');
  } catch (e){ console.error(e); toast('Erro ao salvar. Verifique sua permissão.', 'erro'); }
});

// ---------- Administradores ----------
async function carregarAdmins(){
  const qs = await getDocs(collection(db, COL_ADMINS));
  const admins = qs.docs.map(d => ({ id: d.id, ...d.data() }));
  const box = $('#listaAdmins'); box.innerHTML = '';
  admins.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
  admins.forEach(a => {
    const ehDev = a.role === 'dev';
    const souEu = a.id === MEU.uid;
    // permissão de excluir: não a si mesmo; dev exclui qualquer um; adm só exclui 'adm'
    const podeExcluir = !souEu && (MEU.role === 'dev' || (MEU.role === 'adm' && !ehDev));
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="topbar">
        <div><strong>${a.email || a.id}</strong>
          <span class="badge ${a.role}">${ehDev ? 'DEV' : 'ADM'}</span>
          ${souEu ? '<span class="muted">(você)</span>' : ''}
          ${a.mustChangePassword ? '<span class="muted">• senha provisória</span>' : ''}
        </div>
        ${podeExcluir ? `<button class="btn-sm btn-danger" data-deladm="${a.id}">Excluir</button>` : ''}
      </div>`;
    box.appendChild(card);
  });
  box.querySelectorAll('[data-deladm]').forEach(b => b.addEventListener('click', () => excluirAdmin(b.dataset.deladm)));
}

async function excluirAdmin(uid){
  if (!confirm('Excluir este administrador? (O acesso dele será removido do sistema.)')) return;
  try {
    await deleteDoc(doc(db, COL_ADMINS, uid));
    toast('Administrador removido do sistema.', 'ok', 6000);
    toast('Obs.: a conta de login continua no Firebase Auth até ser apagada no Console.', 'info', 8000);
    await carregarAdmins();
  } catch (e){ console.error(e); toast('Erro ao excluir. Verifique sua permissão.', 'erro'); }
}

$('#btnCriarAdm').addEventListener('click', async () => {
  const email = $('#admEmail').value.trim();
  const senha = $('#admSenha').value;
  const role = $('#admRole').value;
  if (!email || senha.length < 6){ toast('Informe e-mail e senha (mín. 6 caracteres).', 'warn'); return; }

  // Cria a conta num app secundário para NÃO deslogar o admin atual.
  const secApp = initializeApp(firebaseConfig, 'sec_' + email);
  const secAuth = getAuth(secApp);
  try {
    const cred = await createUserWithEmailAndPassword(secAuth, email, senha);
    // grava o doc do admin usando a sessão atual (com permissão)
    await setDoc(doc(db, COL_ADMINS, cred.user.uid), {
      email, role, mustChangePassword: true, criadoEm: serverTimestamp()
    });
    await signOutApp(secAuth);
    $('#admEmail').value = ''; $('#admSenha').value = '';
    toast('Administrador criado! Ele trocará a senha no primeiro acesso.', 'ok', 6000);
    await carregarAdmins();
  } catch (e){
    console.error(e);
    const map = {
      'auth/email-already-in-use': 'Este e-mail já está em uso.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/weak-password': 'Senha muito fraca (mín. 6 caracteres).'
    };
    toast(map[e.code] || 'Erro ao criar administrador.', 'erro');
  } finally {
    try { await deleteApp(secApp); } catch (_){}
  }
});
