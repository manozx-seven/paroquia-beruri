import { db, COL_CADASTROS, CONFIG_DOC } from './firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  aplicarMascaraCPF, aplicarMascaraCelular, onlyDigits, cpfValido, formatarCPF,
  dataBR, toast, preencherSelect, linkWhatsApp
} from './utils.js';

let LISTAS = { comunidades: [], pastorais: [], funcoes: [] };
let cpfLiberado = false;

const form = document.getElementById('form');
const cpfEl = document.getElementById('cpf');
const cpfInfo = document.getElementById('cpfInfo');
const campos = document.getElementById('camposCadastro');
const cpfExistente = document.getElementById('cpfExistente');
const mensagem = document.getElementById('mensagem');
const loading = document.getElementById('loading');

aplicarMascaraCPF(cpfEl);
aplicarMascaraCelular(document.getElementById('celular'));

// ---- Carrega listas do Firestore ----
init();
async function init(){
  try {
    const snap = await getDoc(doc(db, CONFIG_DOC[0], CONFIG_DOC[1]));
    if (snap.exists()) LISTAS = Object.assign(LISTAS, snap.data());
  } catch (e){ console.error(e); toast('Não foi possível carregar as listas.', 'erro'); }

  preencherSelect(document.getElementById('comunidade'), LISTAS.comunidades || []);
  preencherSelect(document.getElementById('funcaoComunidade'), LISTAS.funcoes || []);
  document.getElementById('funcaoComunidade').addEventListener('change', verificarFuncoes);
  adicionarPastoral();
}

// ---- Verificação de CPF (duplicado + validade) ----
let checando = false;
cpfEl.addEventListener('input', () => {
  liberar(false);
  cpfInfo.textContent = '';
  cpfExistente.classList.add('hidden');
  mensagem.textContent = '';
  const cpf = onlyDigits(cpfEl.value);
  if (cpf.length === 11) checarCPF(cpf);
});

async function checarCPF(cpf){
  if (checando) return;
  if (!cpfValido(cpf)){ cpfInfo.innerHTML = '<span style="color:#b00020">CPF inválido.</span>'; return; }
  checando = true;
  cpfInfo.textContent = 'Verificando CPF...';
  try {
    const snap = await getDoc(doc(db, COL_CADASTROS, cpf));
    if (snap.exists()){
      // Trava TODOS os campos e informa
      liberar(false);
      cpfInfo.innerHTML = '<span style="color:#b00020">⚠️ Este CPF já está cadastrado.</span>';
      toast('CPF já cadastrado! Se não foi você, avise a administração.', 'warn', 6000);
      const d = snap.data();
      const msg = `Olá! Estava tentando me cadastrar como agente de pastoral, mas o CPF `
        + `${formatarCPF(cpf)} já aparece como cadastrado e não fui eu. Podem verificar, por favor?`;
      document.getElementById('btnAvisarAdm').href = linkWhatsApp(msg);
      cpfExistente.classList.remove('hidden');
    } else {
      cpfInfo.innerHTML = '<span style="color:var(--ok)">✔ CPF válido. Preencha os demais campos.</span>';
      liberar(true);
    }
  } catch (e){
    console.error(e);
    cpfInfo.innerHTML = '<span style="color:#b00020">Erro ao verificar o CPF. Tente novamente.</span>';
  } finally { checando = false; }
}

function liberar(ok){
  cpfLiberado = ok;
  campos.disabled = !ok;
}

// ---- Pastorais dinâmicas ----
document.getElementById('btnAddPastoral').addEventListener('click', adicionarPastoral);

function adicionarPastoral(){
  const container = document.getElementById('blocoPastorais');
  const div = document.createElement('div');
  div.className = 'pastoral-bloco';

  const lbl1 = document.createElement('label'); lbl1.textContent = 'Pastoral / Grupo:';
  const selPastoral = document.createElement('select');
  selPastoral.name = 'pastoral[]'; selPastoral.className = 'pastoralSelect'; selPastoral.required = true;

  const lbl2 = document.createElement('label'); lbl2.textContent = 'Função:';
  const selFuncao = document.createElement('select');
  selFuncao.name = 'funcao[]'; selFuncao.className = 'funcaoSelect'; selFuncao.required = true;

  const btnRemover = document.createElement('button');
  btnRemover.type = 'button'; btnRemover.textContent = 'Remover'; btnRemover.className = 'btn-danger btn-sm';
  btnRemover.style.marginTop = '10px';
  btnRemover.addEventListener('click', () => { div.remove(); verificarFuncoes(); verificarPastoraisDuplicadas(); });

  div.append(lbl1, selPastoral, lbl2, selFuncao, btnRemover);
  container.appendChild(div);

  preencherSelect(selPastoral, LISTAS.pastorais || []);
  preencherSelect(selFuncao, LISTAS.funcoes || []);
  selPastoral.addEventListener('change', verificarPastoraisDuplicadas);
  selFuncao.addEventListener('change', verificarFuncoes);
  verificarFuncoes(); verificarPastoraisDuplicadas();
}

// Coordenação e Assessoria só podem ser escolhidas uma vez cada
function verificarFuncoes(){
  const todas = document.querySelectorAll('.funcaoSelect');
  let coord = false, assess = false;
  todas.forEach(s => { if (s.value === 'Coordenação') coord = true; if (s.value === 'Assessoria') assess = true; });
  todas.forEach(s => {
    for (const o of s.options){
      if (o.value === 'Coordenação') o.disabled = coord && s.value !== 'Coordenação';
      if (o.value === 'Assessoria') o.disabled = assess && s.value !== 'Assessoria';
    }
  });
}

// Não permite a mesma pastoral duas vezes
function verificarPastoraisDuplicadas(){
  const selects = document.querySelectorAll('.pastoralSelect');
  const usados = [...selects].map(s => s.value).filter(Boolean);
  selects.forEach(s => {
    for (const o of s.options){
      if (!o.value) continue;
      o.disabled = (o.value !== s.value) && usados.includes(o.value);
    }
  });
}

// ---- Envio ----
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!cpfLiberado){ toast('Digite um CPF válido e ainda não cadastrado.', 'warn'); return; }

  const fd = new FormData(form);
  const dados = Object.fromEntries(fd.entries());
  const cpf = onlyDigits(dados.cpf);

  if (!cpfValido(cpf)){ toast('CPF inválido.', 'erro'); return; }
  if (!(LISTAS.comunidades || []).includes(dados.comunidade)){ toast('Selecione uma comunidade válida.', 'warn'); return; }

  const pastoraisNomes = fd.getAll('pastoral[]');
  const funcoes = fd.getAll('funcao[]');
  const pastorais = pastoraisNomes.map((nome, i) => ({ nome, funcao: funcoes[i] || '' }))
    .filter(p => p.nome);

  loading.classList.add('show'); mensagem.textContent = '';
  try {
    // trava de segurança: recheca duplicidade no envio
    const ref = doc(db, COL_CADASTROS, cpf);
    const jaExiste = await getDoc(ref);
    if (jaExiste.exists()){
      loading.classList.remove('show');
      toast('Este CPF já está cadastrado.', 'erro'); return;
    }
    const registro = {
      cpf,
      nome: dados.nome.trim(),
      celular: dados.celular,
      nascimento: dados.nascimento,
      comunidade: dados.comunidade,
      funcaoComunidade: dados.funcaoComunidade,
      pastorais,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    };
    await setDoc(ref, registro);
    mostrarComprovante(registro);
  } catch (err){
    console.error(err);
    toast('Erro ao salvar o cadastro. Tente novamente.', 'erro');
  } finally {
    loading.classList.remove('show');
  }
});

function mostrarComprovante(d){
  const agora = new Date();
  const dataHora = agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR');
  document.getElementById('compNome').textContent = d.nome;
  document.getElementById('compCPF').textContent = formatarCPF(d.cpf);
  document.getElementById('compCelular').textContent = d.celular;
  document.getElementById('compNascimento').textContent = dataBR(d.nascimento);
  document.getElementById('compComunidade').textContent = d.comunidade;
  document.getElementById('compFuncaoComunidade').textContent = d.funcaoComunidade;
  document.getElementById('compPastoral').textContent =
    d.pastorais.map(p => `${p.nome} (${p.funcao})`).join(', ') || '—';
  document.getElementById('compDataHora').textContent = dataHora;

  document.getElementById('formularioContainer').classList.add('hidden');
  document.getElementById('areaPdf').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('btnPdf').addEventListener('click', () => {
  const el = document.getElementById('areaPdf');
  const nome = `comprovante_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  // eslint-disable-next-line no-undef
  html2pdf().set({
    margin: 10, filename: nome, image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(el).save();
});
