# Context — Cadastro de Agentes de Pastoral (Paróquia de Beruri)

> Documento de referência do projeto. Ler junto com `atualizacoes.md` sempre que abrir o terminal aqui.
> Última verificação completa: 2026-07-15.

## 0. Situação atual (LEIA PRIMEIRO)

O projeto está em **migração**. Existem DUAS versões:

- **Versão NOVA (ATIVA — foco atual):** site estático em `site/` publicado no **Netlify**
  (repo GitHub: github.com/manozx-seven/paroquia-beruri), usando **Firebase** (projeto
  `paroquia-beruri`: Firestore como banco + Authentication para login). Tem login de ADM e DEV,
  cadastro público, verificação por CPF+nascimento, painel administrativo, exportação Excel/PDF,
  esqueci/alterar senha. **Os 20 cadastros da planilha antiga já foram migrados** para o Firestore.
  Detalhes na seção 8. Configuração em `SETUP-FIREBASE.md`.
  **Pendências:** conferir itens finais do `SETUP-FIREBASE.md` (regras publicadas, `config/listas`
  semeado, 1º DEV, domínio Netlify autorizado) — ver o PONTO DE PARADA no topo do `atualizacoes.md`.
- **Versão ANTIGA (legada — ainda no ar):** `formulario.html` no Google Sites + Google Apps Script +
  Google Sheets. Descrita nas seções 3–5. Mantida como referência até a nova entrar no ar.

## 1. O que é o projeto

Sistema web de **cadastro dos Agentes de Pastoral** da Paróquia de Beruri (AM).
Um formulário HTML coleta os dados de cada agente (nome, CPF, comunidade, pastorais/grupos e funções)
e envia para uma planilha do Google Sheets através de um **Google Apps Script (Web App)**.

O formulário é publicado dentro de um **Google Sites** institucional (domínio `tjam.jus.br`).

## 2. Arquivos do projeto

| Arquivo | Descrição |
|---|---|
| `formulario.html` | Frontend completo (HTML + CSS + JavaScript) do formulário de cadastro. É o coração do projeto. |
| `site.txt` | URL do Google Sites onde o formulário está publicado. |
| `Agentes de Pastoral - Beruri - Oficial - planilha de dados/Agentes de Pastoral - Beruri - Oficial.xlsx` | Cópia/snapshot da planilha do Google Sheets que serve de banco de dados. |

**URL do site publicado:**
`https://sites.google.com/tjam.jus.br/agentesdepastoral-pnsnberuri/página-inicial`

## 3. Como funciona (arquitetura)

```
Usuário → formulario.html (Google Sites)
            │  fetch/JSONP com querystring (?action=...)
            ▼
   Google Apps Script Web App  (URL termina em /exec)
            │
            ▼
   Google Sheets (1 aba por comunidade)
```

- O frontend chama a API via `callApi()`: primeiro tenta `fetch` (CORS); se o Google Sites mobile
  bloquear, cai no fallback **JSONP** (`jsonp()`). Ambos usam *cache-buster* (`&_=Date.now()`).
- **URL do Web App (Apps Script)** configurada em `formulario.html`, constante `API_BASE`:
  `https://script.google.com/macros/s/AKfycbxeztm3WymcrpxpMF736xd_3rQJYQTucDcbplo6p75_f88L3JiFr4dsHPuS8gpP7c7w/exec`

### Ações da API (parâmetro `action`)
O código do Apps Script **não está neste repositório** (vive no Google), mas o frontend chama:
- `verificarCpfExistenteDetalhado&cpf=...` → verifica se o CPF já foi cadastrado; retorna `{existe, comunidade, funcaoComunidade, pastorais:[{nome,funcao}]}`.
- `salvarCadastro&payload=<JSON>` → salva o cadastro; retorna `{ok:true}` ou `{error}`.
- `removerCadastroPorCpf&cpf=...` → remove o cadastro anterior (usado no botão "Editar"); retorna `{ok:true}`.

## 4. Regras de negócio (no frontend)

- **CPF**: máscara automática `000.000.000-00` + validação de dígitos verificadores (`cpfValido()`).
- **CPF duplicado**: antes de salvar, verifica se já existe. Se existir, mostra os dados atuais e
  o botão **"Editar informações cadastradas"** (remove o antigo e permite recadastrar).
- **Celular**: máscara `(99) 99999-9999`.
- **Comunidade**: `select` obrigatório, precisa estar na lista `COMUNIDADES`.
- **Pastorais/Grupos**: o agente pode adicionar vários blocos (botão "+ Adicionar Pastoral / Grupo").
  - Não permite **pastoral duplicada** no mesmo cadastro (`verificarPastoraisDuplicadas()`).
  - **Coordenação** e **Assessoria** só podem ser escolhidas **uma vez** por cadastro
    (`verificarFuncoes()` desabilita a opção nos demais selects).
- **Comprovante**: ao salvar, gera um comprovante em tela e permite **baixar em PDF**
  (biblioteca `html2pdf.js` via CDN).

### Listas fixas (hardcoded no `formulario.html`)
- **COMUNIDADES (9):** Matriz, Divino Espírito Santo, São José, Bom Pastor, São Francisco,
  Santa Luzia, Santo Antônio, São Pedro, São Raimundo.
- **PASTORAIS (16):** Batismo, COMIPA, Pastoral da Catequese, Cerimoniários, Coroinhas, Cáritas,
  Pastoral do Dízimo, Grupo Esperança Viva, Infância Missionária, Pastoral da Liturgia,
  Ministros Extraordinários, Pastoral Esperança, Pastoral Familiar, Pastoral da Criança,
  Pastoral da Juventude, Pastoral da Pessoa Idosa.
- **FUNCOES (3):** Coordenação, Assessoria, Membro.

## 5. Estrutura da planilha (Google Sheets / xlsx)

O arquivo `.xlsx` tem **9 abas**:

1. **Controle** — tabela de referência com colunas `Comunidades | Pastoral/Grupo | Função`
   (listas de validação de dados; ~1000 linhas de estrutura).
2. **Uma aba por comunidade** — cada cadastro vai para a aba da sua comunidade:
   `São Raimundo`, `São José`, `São Pedro`, `Santo Antônio`, `Bom Pastor`,
   `São Francisco`, `Santa Luzia`, `Matriz`.

**Colunas de cada aba de comunidade:**
`Nome | CPF | Celular | Data de Nascimento | Função na Comunidade |
Pastoral / Grupo 1 | Função 1 | ... | Pastoral / Grupo 5 | Função 5 | Data e Hora`
(a aba `Santa Luzia` tem 2 colunas extras "Coluna 1/2" residuais de edição).

> Observação: `Data de Nascimento` e `Data e Hora` aparecem como **número de série do Excel**
> no xlsx (ex.: `31602`, `45883.65...`) — no Google Sheets são exibidos como data/hora formatada.

## 6. Pontos de atenção / discrepâncias observadas

- ⚠️ A lista `COMUNIDADES` do formulário tem **9** comunidades (inclui **"Divino Espírito Santo"**),
  mas o `.xlsx` só tem **8 abas** de comunidade — **falta a aba "Divino Espírito Santo"**.
  Verificar se a planilha online (Google Sheets) tem essa aba; senão, cadastros dessa comunidade podem falhar.
- O código do **Google Apps Script não está versionado aqui** — mudanças de backend precisam ser feitas
  no editor do Apps Script (via Google). Registrar essas mudanças no `atualizacoes.md`.
- `formulario.html` tem funções `verificarFuncoes` **duplicadas** (definida 2x) e dois listeners
  `DOMContentLoaded` — funciona, mas é candidato a limpeza/refatoração.
- O `.xlsx` é apenas um **snapshot**; a fonte de verdade dos dados é a planilha online do Google.

## 8. Versão NOVA — Netlify + Firebase (arquitetura)

```
Paroquiano/Admin → site estático (Netlify, pasta site/)
                      │  Firebase JS SDK (modular, via CDN)
                      ├── Firebase Authentication  (login ADM/DEV, e-mail+senha)
                      └── Cloud Firestore           (banco de dados)
```

### Estrutura de arquivos (`site/`)
- `index.html` — inicial: texto de boas-vindas + 3 botões (Fazer cadastro / Verificar cadastro / Entrar admin-dev).
- `cadastro.html` + `assets/js/cadastro.js` — formulário. CPF é o 1º campo; se já cadastrado, trava tudo.
- `verificar.html` — busca por CPF + Data de Nascimento; botão de mudança → WhatsApp do pároco.
- `login.html` + `assets/js/login.js` — login; primeiro acesso força troca de senha.
- `admin.html` + `assets/js/admin.js` — painel (abas **Cadastros, Configurações, Administradores,
  Histórico**). Aba Cadastros tem filtro de **ordenação** (Nome A–Z / Mais recentes / Mais antigos),
  mostra a **data/hora de conclusão** de cada cadastro e tem **exportação Excel/PDF** (SheetJS +
  jsPDF/autotable via CDN), respeitando o filtro de comunidade/busca. Aba **Histórico** mostra a
  auditoria das ações dos admins. Aba **Administradores** mostra **status online / último acesso**.
  Só o **DEV** vê o seletor de papel (ADM/DEV) ao criar administrador.
- `assets/js/firebase.js` — init + config (já com as chaves do projeto paroquia-beruri).
- `assets/js/utils.js` — máscaras (CPF/celular), validação de CPF, toast, selects, WhatsApp,
  **`comCarregamento(btn, fn)`** (loader `ldrs` no botão + bloqueio de clique duplo) e `REGRAS_SENHA`.
- `assets/css/styles.css` — **design system** (fonte Inter, gradientes índigo/violeta, sombras,
  transições/animações, toasts). Reescrito no redesign de 2026-07-15.

### Design / UX
- **Estética séria/sofisticada:** paleta índigo profundo + dourado, títulos em serifada **Spectral**,
  corpo em **Inter**, cantos discretos, sombras contidas. **Sem emojis** — usa **ícones SVG** (line
  icons + glifo oficial do WhatsApp) nos botões/links.
- **Loaders `ldrs` (dot-wave)** via CDN em cada página; todo botão de ação usa `comCarregamento()`
  → mostra loader e impede duplo clique/duas ações.
- Ordem dos campos do formulário: **CPF → Data de Nascimento → Nome → ...** (nascimento logo após o CPF).
- **Alerta de CPF já cadastrado** aparece no **topo** (abaixo do CPF), como cartão de alerta com os
  dois botões (verificar / avisar administração).
- **Totalmente responsivo** (celular a desktop): `clamp()` para tipografia/espaços, inputs 16px
  (anti-zoom iOS), `.row` empilha ≤560px, abas roláveis, modal adaptativo, `viewport-fit=cover`.
- Fora de `site/`: `netlify.toml` (publica `site/`), `firestore.rules` (regras), `SETUP-FIREBASE.md` (guia).

### Modelo de dados no Firestore
- **`cadastros/{cpf}`** (id do doc = CPF só com dígitos, 11 números):
  `{ cpf, nome, celular, nascimento (yyyy-mm-dd), comunidade, funcaoComunidade,
     pastorais:[{nome,funcao}], criadoEm, atualizadoEm }`.
- **`config/listas`** (doc único): `{ comunidades:[], pastorais:[], funcoes:[] }` — editável na aba Configurações.
- **`admins/{uid}`** (id = uid do Authentication): `{ email, role:'adm'|'dev', mustChangePassword, criadoEm,
  ultimoAcesso, ultimoAtivo }`. `ultimoAcesso` = última abertura do painel; `ultimoAtivo` = heartbeat
  (usado para "online agora": ativo nos últimos 2 min).
- **`atividades/{autoId}`** (auditoria): `{ uid, email, role, acao, descricao, quando }`. `acao` ∈
  {login, editar_cadastro, excluir_cadastro, editar_config, criar_admin, excluir_admin, alterar_senha}.
  Regras: admin lê; cria só em nome do próprio uid; imutável; só DEV apaga. Exibida na aba **Histórico**.

### Papéis e permissões (regras em `firestore.rules`)
- **Público:** pode criar cadastro (create, não sobrescreve existente) e fazer `get` de um cadastro por CPF
  (usado no anti-duplicidade e no "verificar"). Não pode listar todos nem editar/excluir.
- **ADM:** lista/edita/exclui cadastros; edita `config/listas`; cria admins; exclui apenas ADMs (não DEV).
- **DEV (superadmin):** tudo do ADM + exclui qualquer admin; não pode ser removido por um ADM.
- Criar novo admin pelo painel usa um **app Firebase secundário** (não desloga o admin atual).

### Regras de negócio (na versão nova)
- CPF: máscara `000.000.000-00` enquanto digita + validação dos dígitos verificadores.
- Ao digitar CPF já existente: trava todos os campos, toast de aviso, botões "fui eu → verificar" e
  "não fui eu → avisar administração (WhatsApp)".
- Pastorais: adicionar/remover blocos; sem pastoral duplicada; **Coordenação** e **Assessoria** só uma
  vez cada — a **Função na Comunidade participa dessa regra**: se for Coordenação, não pode Coordenação
  em pastoral; se for Assessoria, não pode Assessoria em pastoral (e vice-versa).
- Verificar cadastro: exige CPF **e** data de nascimento corretos para exibir os dados.
- Solicitar mudança: botão abre WhatsApp do pároco **(97) 98802-5117** (`wa.me/5597988025117`) com msg pronta;
  a alteração de fato é feita pelo ADM/DEV no painel.
- Login tem **"Esqueci minha senha"** (envia e-mail de redefinição). No painel, aba **Configurações**,
  há **"Minha conta — alterar senha"** (reautentica com a senha atual e troca por uma senha forte).
- Primeiro acesso de admin (`mustChangePassword=true`): força cadastro de nova senha, que deve ser
  **forte** (mín. 8 caracteres, maiúscula, minúscula, número e caractere especial — ver
  `REGRAS_SENHA`/`validarSenhaForte` em `utils.js`). Lista de regras marca ✔/✗ ao vivo no `login.html`.

## 7. Ambiente

- Pasta do projeto: `C:\Users\murylo.neves\Desktop\Paróquia Beruri`
- Não é repositório git.
- Sistema operacional: Windows 11. Shell: PowerShell.
