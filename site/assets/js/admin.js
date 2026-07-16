import { app, auth, db, firebaseConfig, COL_CADASTROS, COL_ADMINS, COL_ATIVIDADES, CONFIG_DOC } from './firebase.js';
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  onAuthStateChanged, signOut, getAuth,
  createUserWithEmailAndPassword, signOut as signOutApp,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp,
  addDoc, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  formatarCPF, dataBR, dataHoraBR, tempoRelativo, paraData, toast, preencherSelect,
  onlyDigits, comCarregamento, REGRAS_SENHA, validarSenhaForte, olhoSenhaEm
} from './utils.js';

let MEU = { uid: null, email: null, role: null };
let LISTAS = { comunidades: [], pastorais: [], funcoes: [] };
let CADASTROS = []; // {id, ...dados}
let ATIVIDADES = []; // {id, uid, email, role, acao, descricao, quando}

const ONLINE_MS = 2 * 60 * 1000;   // considerado "online" se ativo nos últimos 2 min
const HEARTBEAT_MS = 60 * 1000;    // atualiza o "ativo agora" a cada 1 min

const IC_EDIT = '<svg class="ic ic-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const IC_TRASH = '<svg class="ic ic-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>';

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
    // Só o DEV pode escolher o papel (ADM/DEV) ao criar conta; ADM comum só cria administrador.
    if (MEU.role === 'dev') $('#admRole').classList.remove('hidden');
    await marcarAcesso();          // último acesso + presença + registra "entrou no painel"
    await carregarTudo();
    iniciarPresenca();             // heartbeat: mantém "ativo agora" atualizado
  } catch (e){
    console.error(e); toast('Erro ao carregar o painel.', 'erro');
  }
});

const btnSair = $('#btnSair');
btnSair.addEventListener('click', () => comCarregamento(btnSair, async () => {
  await signOut(auth); location.href = './index.html';
}));

// ---------- Abas ----------
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  document.querySelectorAll('.tabpane').forEach(p => p.classList.add('hidden'));
  $('#tab-' + t.dataset.tab).classList.remove('hidden');
}));

async function carregarTudo(){
  carregando.classList.add('show');
  await Promise.all([carregarListas(), carregarCadastros(), carregarAdmins(), carregarAtividades()]);
  carregando.classList.remove('show');
  $('#tab-cadastros').classList.remove('hidden');
}

// ---------- Auditoria / presença ----------
// Registra uma atividade no histórico (nunca quebra a ação principal se o log falhar).
async function registrarAtividade(acao, descricao){
  try {
    await addDoc(collection(db, COL_ATIVIDADES), {
      uid: MEU.uid, email: MEU.email, role: MEU.role,
      acao, descricao: descricao || '', quando: serverTimestamp()
    });
  } catch (e){ console.warn('Falha ao registrar atividade:', e); }
}

// Marca o último acesso + presença ao abrir o painel e registra a entrada.
// O registro de "Entrou no painel" acontece só 1x por sessão do navegador
// (recarregar a página não gera um novo registro, mas o último acesso é sempre atualizado).
async function marcarAcesso(){
  try {
    await updateDoc(doc(db, COL_ADMINS, MEU.uid), {
      ultimoAcesso: serverTimestamp(), ultimoAtivo: serverTimestamp()
    });
  } catch (e){ console.warn('Falha ao marcar acesso:', e); }
  try {
    if (!sessionStorage.getItem('logou')){
      await registrarAtividade('login', 'Entrou no painel');
      sessionStorage.setItem('logou', '1');
    }
  } catch { await registrarAtividade('login', 'Entrou no painel'); }
}

// Heartbeat: mantém "ativo agora" atualizado enquanto o painel está aberto.
function iniciarPresenca(){
  const bater = () => updateDoc(doc(db, COL_ADMINS, MEU.uid), { ultimoAtivo: serverTimestamp() }).catch(() => {});
  setInterval(bater, HEARTBEAT_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) bater(); });
}

// "online" se o último sinal de atividade foi há menos de ONLINE_MS.
function estaOnline(a){
  const d = paraData(a.ultimoAtivo);
  return !!d && (Date.now() - d.getTime()) < ONLINE_MS;
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
    registrarAtividade('editar_config', 'Atualizou as listas (comunidades / pastorais / funções)');
    toast('Configurações salvas.', 'ok');
  } catch (e){ console.error(e); toast('Erro ao salvar. Verifique sua permissão.', 'erro'); }
}

// ---------- Cadastros ----------
async function carregarCadastros(){
  const qs = await getDocs(collection(db, COL_CADASTROS));
  CADASTROS = qs.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCadastros();
}

$('#filtro').addEventListener('input', renderCadastros);
$('#filtroComunidade').addEventListener('change', renderCadastros);
$('#ordenar').addEventListener('change', renderCadastros);

// Milissegundos do campo criadoEm (Timestamp do Firestore, {seconds}, Date ou string) p/ ordenar.
function criadoEmMillis(c){
  const d = paraData(c.criadoEm);
  return d ? d.getTime() : 0;
}

// aplica busca + filtro de comunidade + ordenação e retorna a lista resultante
function filtrarCadastros(){
  const raw = $('#filtro').value.trim().toLowerCase();
  const dig = onlyDigits($('#filtro').value);
  const comFiltro = $('#filtroComunidade').value;
  const ordem = $('#ordenar').value;
  const lista = CADASTROS.filter(c => {
    if (comFiltro && c.comunidade !== comFiltro) return false;
    if (!raw) return true;
    const porNome = (c.nome || '').toLowerCase().includes(raw);
    const porCom = (c.comunidade || '').toLowerCase().includes(raw);
    const porCpf = dig.length > 0 && c.id.includes(dig);
    return porNome || porCom || porCpf;
  });
  if (ordem === 'recentes') lista.sort((a, b) => criadoEmMillis(b) - criadoEmMillis(a));
  else if (ordem === 'antigos') lista.sort((a, b) => criadoEmMillis(a) - criadoEmMillis(b));
  else lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  return lista;
}

function renderCadastros(){
  const box = $('#listaCadastros'); box.innerHTML = '';
  const filtrados = filtrarCadastros();

  $('#contadorCadastros').textContent = `${filtrados.length} cadastro(s).`;
  filtrados.forEach(c => {
    const past = (c.pastorais || []).map(p => `${p.nome} (${p.funcao})`).join(', ') || '—';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="topbar">
        <h4 style="margin:0">${c.nome || '(sem nome)'}</h4>
        <div class="card-actions">
          <button class="btn-sm btn-ghost" data-edit="${c.id}">${IC_EDIT} Editar</button>
          <button class="btn-sm btn-danger" data-del="${c.id}">${IC_TRASH} Excluir</button>
        </div>
      </div>
      <p class="muted" style="margin:4px 0">
        <strong>CPF:</strong> ${formatarCPF(c.id)} &nbsp;•&nbsp;
        <strong>Cel:</strong> ${c.celular || '—'} &nbsp;•&nbsp;
        <strong>Nasc.:</strong> ${dataBR(c.nascimento)}</p>
      <p style="margin:4px 0"><strong>${c.comunidade || '—'}</strong> — ${c.funcaoComunidade || '—'}</p>
      <p style="margin:4px 0"><strong>Pastorais:</strong> ${past}</p>
      <p class="muted" style="margin:4px 0;font-size:12.5px">
        <svg class="ic ic-sm" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align:-3px"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        Cadastro concluído em ${dataHoraBR(c.criadoEm)}</p>`;
    box.appendChild(card);
  });

  box.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => abrirEdicao(b.dataset.edit)));
  box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => excluirCadastro(b.dataset.del, b)));
}

async function excluirCadastro(id, btn){
  const c = CADASTROS.find(x => x.id === id);
  if (!confirm(`Excluir o cadastro de ${c?.nome || formatarCPF(id)}?`)) return;
  await comCarregamento(btn, async () => {
    try {
      await deleteDoc(doc(db, COL_CADASTROS, id));
      CADASTROS = CADASTROS.filter(x => x.id !== id);
      renderCadastros();
      registrarAtividade('excluir_cadastro', `Excluiu o cadastro de ${c?.nome || formatarCPF(id)}`);
      toast('Cadastro excluído.', 'ok');
    } catch (e){ console.error(e); toast('Erro ao excluir.', 'erro'); }
  });
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

  const mNome = $('#mNome');
  mNome.addEventListener('input', () => {
    const pos = mNome.selectionStart;
    mNome.value = mNome.value.toLocaleUpperCase('pt-BR');
    mNome.setSelectionRange(pos, pos);
  });

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

const btnModalSalvar = $('#modalSalvar');
btnModalSalvar.addEventListener('click', () => comCarregamento(btnModalSalvar, async () => {
  if (!editId) return;
  const pastorais = [...$('#mPastorais').querySelectorAll('.pastoral-bloco')].map(b => ({
    nome: b.querySelector('.mPast').value,
    funcao: b.querySelector('.mFunc').value
  })).filter(p => p.nome);

  const dados = {
    nome: $('#mNome').value.trim().toLocaleUpperCase('pt-BR'),
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
    registrarAtividade('editar_cadastro', `Editou o cadastro de ${dados.nome || formatarCPF(editId)}`);
    toast('Cadastro atualizado.', 'ok');
  } catch (e){ console.error(e); toast('Erro ao salvar. Verifique sua permissão.', 'erro'); }
}));

// ---------- Exportação (Excel / PDF) ----------
function rotuloSelecao(){
  return $('#filtroComunidade').value || 'Todas as comunidades';
}
function nomeArquivo(ext){
  const c = $('#filtroComunidade').value;
  const base = c
    ? c.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
    : 'todas';
  const data = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  return `agentes_${base}_${data}.${ext}`;
}

function exportarExcel(){
  const lista = filtrarCadastros();
  if (!lista.length){ toast('Nenhum cadastro para exportar.', 'warn'); return; }
  if (!window.XLSX){ toast('Biblioteca de Excel não carregou. Recarregue a página.', 'erro'); return; }

  const maxPast = Math.max(1, ...lista.map(c => (c.pastorais || []).length));
  const header = ['Nome', 'CPF', 'Celular', 'Data de Nascimento', 'Comunidade', 'Função na Comunidade', 'Cadastrado em'];
  for (let i = 1; i <= maxPast; i++) header.push(`Pastoral ${i}`, `Função ${i}`);

  const aoa = [header];
  lista.forEach(c => {
    const row = [c.nome || '', formatarCPF(c.id), c.celular || '', dataBR(c.nascimento),
      c.comunidade || '', c.funcaoComunidade || '', dataHoraBR(c.criadoEm)];
    for (let i = 0; i < maxPast; i++){
      const p = (c.pastorais || [])[i];
      row.push(p ? p.nome : '', p ? p.funcao : '');
    }
    aoa.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  const aba = ($('#filtroComunidade').value || 'Todos').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, aba);
  XLSX.writeFile(wb, nomeArquivo('xlsx'));
  toast(`Excel exportado: ${lista.length} cadastro(s).`, 'ok');
}

function exportarPdf(){
  const lista = filtrarCadastros();
  if (!lista.length){ toast('Nenhum cadastro para exportar.', 'warn'); return; }
  if (!window.jspdf || !window.jspdf.jsPDF){ toast('Biblioteca de PDF não carregou. Recarregue a página.', 'erro'); return; }

  const { jsPDF } = window.jspdf;
  const docp = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const titulo = 'Agentes de Pastoral — Paróquia N. S. de Nazaré de Beruri';
  const sub = `${rotuloSelecao()} • ${lista.length} cadastro(s) • ${new Date().toLocaleDateString('pt-BR')}`;
  docp.setFontSize(13); docp.text(titulo, 14, 13);
  docp.setFontSize(9); docp.setTextColor(90); docp.text(sub, 14, 19); docp.setTextColor(0);

  const head = [['Nome', 'CPF', 'Celular', 'Nascimento', 'Comunidade', 'Função Com.', 'Cadastrado em', 'Pastorais / Grupos (Função)']];
  const body = lista.map(c => [
    c.nome || '', formatarCPF(c.id), c.celular || '', dataBR(c.nascimento),
    c.comunidade || '', c.funcaoComunidade || '', dataHoraBR(c.criadoEm),
    (c.pastorais || []).map(p => `${p.nome} (${p.funcao})`).join('; ') || '—'
  ]);
  docp.autoTable({
    head, body, startY: 23,
    styles: { fontSize: 8, cellPadding: 1.6, overflow: 'linebreak' },
    headStyles: { fillColor: [63, 81, 181] },
    columnStyles: { 7: { cellWidth: 70 } }
  });
  docp.save(nomeArquivo('pdf'));
  toast(`PDF exportado: ${lista.length} cadastro(s).`, 'ok');
}

const btnExcel = $('#btnExportExcel'), btnPdf = $('#btnExportPdf');
btnExcel.addEventListener('click', () => comCarregamento(btnExcel, async () => exportarExcel()));
btnPdf.addEventListener('click', () => comCarregamento(btnPdf, async () => exportarPdf()));

// ---------- Administradores ----------
let ADMINS = []; // cache dos administradores (para logs e status)
async function carregarAdmins(){
  const qs = await getDocs(collection(db, COL_ADMINS));
  const admins = qs.docs.map(d => ({ id: d.id, ...d.data() }));
  ADMINS = admins;
  const box = $('#listaAdmins'); box.innerHTML = '';
  admins.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
  admins.forEach(a => {
    const ehDev = a.role === 'dev';
    const souEu = a.id === MEU.uid;
    // permissão de excluir: não a si mesmo; dev exclui qualquer um; adm só exclui 'adm'
    const podeExcluir = !souEu && (MEU.role === 'dev' || (MEU.role === 'adm' && !ehDev));
    const online = estaOnline(a);
    const statusHtml = online
      ? '<span class="status-online">online agora</span>'
      : `<span class="muted">Último acesso: ${a.ultimoAcesso ? `${dataHoraBR(a.ultimoAcesso)} (${tempoRelativo(a.ultimoAcesso)})` : 'nunca acessou'}</span>`;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="topbar">
        <div><strong>${a.email || a.id}</strong>
          <span class="badge ${a.role}">${ehDev ? 'DEV' : 'ADM'}</span>
          ${souEu ? '<span class="muted">(você)</span>' : ''}
          ${a.mustChangePassword ? '<span class="muted">• senha provisória</span>' : ''}
        </div>
        ${podeExcluir ? `<button class="btn-sm btn-danger" data-deladm="${a.id}">${IC_TRASH} Excluir</button>` : ''}
      </div>
      <p style="margin:6px 0 0">${statusHtml}</p>`;
    box.appendChild(card);
  });
  box.querySelectorAll('[data-deladm]').forEach(b => b.addEventListener('click', () => excluirAdmin(b.dataset.deladm, b)));
}

async function excluirAdmin(uid, btn){
  if (!confirm('Excluir este administrador? (O acesso dele será removido do sistema.)')) return;
  const alvo = ADMINS.find(x => x.id === uid);
  await comCarregamento(btn, async () => {
    try {
      await deleteDoc(doc(db, COL_ADMINS, uid));
      registrarAtividade('excluir_admin', `Removeu o administrador ${alvo?.email || uid}`);
      toast('Administrador removido do sistema.', 'ok', 6000);
      toast('Obs.: a conta de login continua no Firebase Auth até ser apagada no Console.', 'info', 8000);
      await carregarAdmins();
    } catch (e){ console.error(e); toast('Erro ao excluir. Verifique sua permissão.', 'erro'); }
  });
}

const btnCriarAdm = $('#btnCriarAdm');
btnCriarAdm.addEventListener('click', () => comCarregamento(btnCriarAdm, async () => {
  const email = $('#admEmail').value.trim();
  const senha = $('#admSenha').value;
  // Apenas o DEV pode definir o papel; para ADM comum força 'adm' (independente do que vier no DOM).
  const role = (MEU.role === 'dev') ? $('#admRole').value : 'adm';
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
    registrarAtividade('criar_admin', `Criou o administrador ${email} (${role === 'dev' ? 'DEV' : 'ADM'})`);
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
}));

// ---------- Histórico de atividades ----------
async function carregarAtividades(){
  try {
    const q = query(collection(db, COL_ATIVIDADES), orderBy('quando', 'desc'), limit(300));
    const qs = await getDocs(q);
    ATIVIDADES = qs.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e){ console.error(e); ATIVIDADES = []; }
  renderAtividades();
}

$('#filtroHist').addEventListener('input', renderAtividades);
const btnAtualizarHist = $('#btnAtualizarHist');
btnAtualizarHist.addEventListener('click', () => comCarregamento(btnAtualizarHist, async () => {
  await Promise.all([carregarAtividades(), carregarAdmins()]);
  toast('Histórico atualizado.', 'ok');
}));

function renderAtividades(){
  const box = $('#listaAtividades'); box.innerHTML = '';
  const termo = $('#filtroHist').value.trim().toLowerCase();
  const lista = ATIVIDADES.filter(a => !termo
    || (a.email || '').toLowerCase().includes(termo)
    || (a.descricao || '').toLowerCase().includes(termo)
    || (a.acao || '').toLowerCase().includes(termo));

  $('#contadorHist').textContent = `${lista.length} registro(s).`;
  if (!lista.length){ box.innerHTML = '<p class="muted">Nenhuma atividade registrada ainda.</p>'; return; }

  lista.forEach(a => {
    const ehDev = a.role === 'dev';
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
      <span class="log-dot log-${(a.acao || 'info').split('_')[0]}"></span>
      <div class="log-body">
        <p style="margin:0"><strong>${a.email || a.uid || '—'}</strong>
          <span class="badge ${a.role || 'adm'}">${ehDev ? 'DEV' : 'ADM'}</span></p>
        <p style="margin:2px 0">${a.descricao || a.acao || '—'}</p>
        <p class="muted" style="margin:0;font-size:12px">${dataHoraBR(a.quando)} • ${tempoRelativo(a.quando)}</p>
      </div>`;
    box.appendChild(item);
  });
}

// ---------- Alterar minha senha (aba Configurações) ----------
const pwAtual = $('#pwAtual'), pwNova = $('#pwNova'), pwNova2 = $('#pwNova2');
const btnTrocarSenha = $('#btnTrocarSenha'), pwLista = $('#pwRegras');

// olho para mostrar/ocultar senha (troca de senha + senha provisória de novos admins)
olhoSenhaEm(pwAtual, pwNova, pwNova2, $('#admSenha'));

REGRAS_SENHA.forEach(r => {
  const li = document.createElement('li'); li.dataset.id = r.id; li.textContent = r.txt; pwLista.appendChild(li);
});
function avaliarPw(){
  const s = pwNova.value; let todasOk = true;
  REGRAS_SENHA.forEach(r => {
    const li = pwLista.querySelector(`[data-id="${r.id}"]`);
    const ok = r.teste(s); li.classList.toggle('ok', ok); if (!ok) todasOk = false;
  });
  const match = s.length > 0 && s === pwNova2.value;
  btnTrocarSenha.disabled = !(todasOk && match && pwAtual.value.length > 0);
}
[pwAtual, pwNova, pwNova2].forEach(el => el.addEventListener('input', avaliarPw));

btnTrocarSenha.addEventListener('click', () => comCarregamento(btnTrocarSenha, async () => {
  const s1 = pwNova.value, s2 = pwNova2.value;
  const { ok, faltas } = validarSenhaForte(s1);
  if (!ok){ toast('Senha fraca. Falta: ' + faltas.map(f => f.txt.toLowerCase()).join('; '), 'warn', 6000); return; }
  if (s1 !== s2){ toast('As senhas não conferem.', 'warn'); return; }
  try {
    // reautentica com a senha atual antes de trocar (evita "requires-recent-login")
    const cred = EmailAuthProvider.credential(MEU.email, pwAtual.value);
    await reauthenticateWithCredential(auth.currentUser, cred);
    await updatePassword(auth.currentUser, s1);
    pwAtual.value = ''; pwNova.value = ''; pwNova2.value = ''; avaliarPw();
    registrarAtividade('alterar_senha', 'Alterou a própria senha');
    toast('Senha alterada com sucesso!', 'ok');
  } catch (e){
    console.error(e);
    const map = {
      'auth/invalid-credential': 'Senha atual incorreta.',
      'auth/wrong-password': 'Senha atual incorreta.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.'
    };
    toast(map[e.code] || 'Não foi possível alterar a senha.', 'erro');
  }
}));
