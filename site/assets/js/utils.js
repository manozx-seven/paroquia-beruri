// Utilitários compartilhados (sem dependências)

export const WHATSAPP_PAROCO = '5597988025117'; // (97) 98802-5117

export function onlyDigits(v){ return (v || '').replace(/\D/g, ''); }

// Máscara de CPF conforme digita: 000.000.000-00
export function aplicarMascaraCPF(input){
  input.addEventListener('input', () => {
    let v = onlyDigits(input.value).slice(0, 11);
    input.value = v
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  });
}

// Máscara de celular: (99) 99999-9999
export function aplicarMascaraCelular(input){
  input.addEventListener('input', () => {
    let v = onlyDigits(input.value).slice(0, 11);
    input.value = v.replace(/(\d{0,2})(\d{0,5})(\d{0,4})/, (m, p1, p2, p3) => {
      if (p3) return `(${p1}) ${p2}-${p3}`;
      if (p2) return `(${p1}) ${p2}`;
      if (p1) return `(${p1}`;
      return '';
    });
  });
}

// Validação matemática do CPF (dígitos verificadores)
export function cpfValido(cpf){
  cpf = onlyDigits(cpf);
  if (!cpf || cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf[i-1]) * (11 - i);
  resto = (soma * 10) % 11; if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf[i-1]) * (12 - i);
  resto = (soma * 10) % 11; if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf[10]);
}

export function formatarCPF(cpf){
  const v = onlyDigits(cpf).slice(0, 11);
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// yyyy-mm-dd -> dd/mm/yyyy
export function dataBR(iso){
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  if (!a || !m || !d) return iso;
  return `${d}/${m}/${a}`;
}

// Converte um valor de data (Timestamp do Firestore, {seconds}, Date ou string ISO) em Date.
export function paraData(v){
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v.toDate === 'function') { try { return v.toDate(); } catch { return null; } }
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  const t = Date.parse(v);
  return isNaN(t) ? null : new Date(t);
}

// Formata para "dd/mm/aaaa HH:MM" (pt-BR). Retorna '—' se não houver data.
export function dataHoraBR(v){
  const d = paraData(v);
  if (!d) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// "há X minutos/horas/dias" a partir de um valor de data. Retorna '' se não houver data.
export function tempoRelativo(v){
  const d = paraData(v);
  if (!d) return '';
  const seg = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seg < 60) return 'agora mesmo';
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  return dataHoraBR(d);
}

// Toast
export function toast(msg, tipo = 'info', ms = 4000){
  let wrap = document.getElementById('toastWrap');
  if (!wrap){ wrap = document.createElement('div'); wrap.id = 'toastWrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, ms);
}

// ordena strings em pt-BR
export function ordenar(arr){ return arr.slice().sort((a, b) => a.localeCompare(b, 'pt-BR')); }

// preenche um <select> com placeholder "Selecione"
export function preencherSelect(sel, itens, { placeholder = 'Selecione', ordenado = true } = {}){
  sel.innerHTML = '';
  const first = document.createElement('option');
  first.value = ''; first.textContent = placeholder; first.disabled = true; first.selected = true;
  sel.appendChild(first);
  (ordenado ? ordenar(itens) : itens).forEach(v => {
    const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o);
  });
}

// Link de WhatsApp com mensagem pronta
export function linkWhatsApp(texto){
  return `https://wa.me/${WHATSAPP_PAROCO}?text=${encodeURIComponent(texto)}`;
}

// ---- Carregamento em botões de ação (com bloqueio de clique duplo) ----
// Uso: btn.addEventListener('click', () => comCarregamento(btn, async () => { ...ação... }))
export async function comCarregamento(btn, fn){
  if (!btn || btn.dataset.busy === '1') return;              // já em execução -> ignora clique duplo
  btn.dataset.busy = '1';
  btn.classList.add('is-loading');
  btn.setAttribute('aria-busy', 'true');
  const originalHTML = btn.innerHTML;
  const w = btn.offsetWidth, h = btn.offsetHeight;
  btn.style.minWidth = w + 'px';
  btn.style.minHeight = h + 'px';
  const escuro = btn.classList.contains('btn-outline') || btn.classList.contains('btn-ghost') || btn.classList.contains('btn-gold') || btn.classList.contains('tab') || btn.classList.contains('linklike');
  const cor = escuro ? '#3d3f95' : '#ffffff';
  btn.innerHTML = `<span class="btn-loader"><l-dot-wave size="30" speed="1" color="${cor}"></l-dot-wave></span>`;
  try {
    return await fn();
  } finally {
    btn.dataset.busy = '';
    btn.classList.remove('is-loading');
    btn.removeAttribute('aria-busy');
    btn.innerHTML = originalHTML;
    btn.style.minWidth = '';
    btn.style.minHeight = '';
  }
}

// ---- Olho para mostrar/ocultar senha ----
const _EYE = '<svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const _EYE_OFF = '<svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 7 11 7a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.1 6.1A13.3 13.3 0 0 0 1 12s4 7 11 7a9.1 9.1 0 0 0 5.9-2.1"/><path d="m2 2 20 20"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

export function olhoSenha(input){
  if (!input || input.dataset.eye === '1') return;
  input.dataset.eye = '1';
  const wrap = document.createElement('span');
  wrap.className = 'pw-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'pw-toggle'; btn.tabIndex = -1;
  btn.setAttribute('aria-label', 'Mostrar senha');
  btn.innerHTML = _EYE;
  wrap.appendChild(btn);
  btn.addEventListener('click', () => {
    const mostrar = input.type === 'password';
    input.type = mostrar ? 'text' : 'password';
    btn.innerHTML = mostrar ? _EYE_OFF : _EYE;
    btn.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  });
}

// aplica o olho em vários inputs de senha
export function olhoSenhaEm(...inputs){ inputs.forEach(olhoSenha); }

// ---- Regras de senha forte ----
export const REGRAS_SENHA = [
  { id: 'len',  txt: 'Pelo menos 8 caracteres',           teste: s => s.length >= 8 },
  { id: 'maiu', txt: 'Uma letra maiúscula (A–Z)',          teste: s => /[A-Z]/.test(s) },
  { id: 'minu', txt: 'Uma letra minúscula (a–z)',          teste: s => /[a-z]/.test(s) },
  { id: 'num',  txt: 'Um número (0–9)',                    teste: s => /[0-9]/.test(s) },
  { id: 'esp',  txt: 'Um caractere especial (!@#$%&*…)',   teste: s => /[^A-Za-z0-9]/.test(s) }
];

// Retorna { ok, faltas: [regras não atendidas] }
export function validarSenhaForte(senha){
  const s = senha || '';
  const faltas = REGRAS_SENHA.filter(r => !r.teste(s));
  return { ok: faltas.length === 0, faltas };
}
