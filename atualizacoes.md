# Atualizações — Cadastro de Agentes de Pastoral (Paróquia de Beruri)

> Registro cronológico de TODA e QUALQUER mudança feita no projeto.
> Sempre que abrir o terminal aqui, ler este arquivo + `context.md` para saber onde paramos.
> Regra: a cada mudança, adicionar uma entrada nova no **topo** (mais recente primeiro),
> com data, o que mudou, quais arquivos e o motivo.

---

## Como registrar (modelo)

```
## AAAA-MM-DD — Título curto da mudança
- **Arquivos:** arquivo(s) alterado(s)
- **O que mudou:** descrição objetiva
- **Motivo:** por que foi feito
- **Status:** concluído / em andamento / pendente
- **Próximos passos:** (se houver)
```

---

## 2026-07-15 — PONTO DE PARADA da sessão
- **Onde paramos:** sistema novo (site `site/` + Firebase) funcional e publicado; **20 cadastros da
  planilha já migrados** para o Firestore. Repositório GitHub em dia (branch `main` sincronizada).
- **Feito nesta sessão (resumo):** migração Netlify+Firebase; cadastro/verificar/login/painel;
  exportação Excel/PDF; redesign sério + ícones SVG + responsividade; logo oficial + favicon;
  botão admin flutuante; esqueci/alterar senha; olho de senha; nome em MAIÚSCULO; regra função
  comunidade × pastorais; migração dos dados.
- **Pendências para retomar depois (do usuário):**
  1. Concluir/conferir o **Firebase** se ainda faltar algo do `SETUP-FIREBASE.md` (regras publicadas,
     `config/listas` semeado, 1º DEV criado, domínio do Netlify autorizado no Authentication).
  2. Conferir se o **Netlify** está publicando a partir do GitHub (deploy automático).
  3. Opcional: personalizar o template de e-mail de "redefinir senha" (Firebase → Authentication →
     Templates), em português.
- **Ideias futuras registradas:** relatório de contagem por pastoral/comunidade; segurança forte do
  "verificar cadastro" via Firebase Functions; apagar conta do Auth ao remover admin.
- **Status:** sessão encerrada a pedido do usuário.

## 2026-07-15 — Migração dos dados da planilha antiga para o Firestore
- **O que foi feito:** os **20 cadastros** das abas por comunidade da planilha `.xlsx` foram
  importados para a coleção `cadastros` do Firestore (projeto paroquia-beruri).
- **Processo:** script Python leu a planilha (converteu datas seriais do Excel → `yyyy-mm-dd`,
  validou CPFs, normalizou nomes) e gerou um JSON; um script Node (Firebase Web SDK) gravou cada
  registro com id = CPF (só dígitos), pulando os que já existissem. Campos: cpf, nome (MAIÚSCULO),
  celular, nascimento, comunidade, funcaoComunidade, pastorais[{nome,funcao}], criadoEm (data/hora
  original do cadastro), atualizadoEm, `origem:'planilha-migracao'`.
- **Mapeamentos:** aba "Matriz" → comunidade **"Nossa Senhora de Nazaré (Matriz)"**; demais abas
  mantiveram o nome. Todas as pastorais/funções já batiam com as listas novas.
- **Verificação:** 20 importados, 0 duplicados, 0 CPFs inválidos, 0 sem nascimento; conferido lendo
  registros de volta do Firestore.
- **Privacidade:** a ferramenta de migração e o JSON (com dados pessoais) foram feitos **localmente**,
  ignorados no `.gitignore` e apagados após a importação — **nada disso foi para o GitHub**.
- **Obs.:** a comunidade "Divino Espírito Santo" não tinha aba na planilha (0 registros migrados).
- **Status:** concluído.

## 2026-07-15 — Correção: logo do círculo aparecia minúscula
- **Arquivos:** `assets/css/styles.css`
- **O que mudou:** o `.logo-circle` estava com `display:grid` + `padding:15%`, o que fazia a altura
  da imagem colapsar e a logo aparecer minúscula. Trocado para **flex** (centralização) com a imagem
  em `width/height:90%` e `overflow:hidden` recortando apenas os cantos brancos vazios do quadrado.
- **Status:** concluído.

## 2026-07-15 — Ajustes: nome maiúsculo, olho de senha, círculo da logo e espaçamentos
- **Arquivos:** `assets/css/styles.css`, `assets/js/utils.js`, `cadastro.js`, `admin.js`,
  `login.js`, `admin.html`.
- **Nome completo sempre em MAIÚSCULO:** no formulário (ao digitar) e ao salvar; também na edição
  pelo painel (`toLocaleUpperCase('pt-BR')`).
- **Correção do círculo da logo:** a imagem quadrada estava vazando para fora do círculo. Agora o
  medalhão tem `overflow:hidden` e `padding:15%` (13% no menor), de modo que o quadrado inteiro cabe
  dentro do círculo, sem cantos para fora.
- **Olho para ver a senha:** helper `olhoSenha()`/`olhoSenhaEm()` em `utils.js` adiciona o ícone de
  olho (mostrar/ocultar) em todos os campos de senha — login, troca no primeiro acesso, alterar senha
  no painel e senha provisória de novo admin.
- **Espaçamento:** botão "Criar administrador" (aba Administradores) estava colado aos campos; agora
  tem o mesmo espaçamento dos demais.
- **Status:** concluído.

## 2026-07-15 — Esqueci/alterar senha, logo em círculo e regra função comunidade × pastorais
- **Arquivos:** `site/login.html` + `login.js`, `site/admin.html` + `admin.js`, `site/index.html`,
  `site/cadastro.html` + `cadastro.js`, `assets/css/styles.css`, `assets/js/utils.js`.
- **Esqueci minha senha (login):** link "Esqueci minha senha" que envia e-mail de redefinição via
  Firebase (`sendPasswordResetEmail`).
- **Alterar senha (painel → aba Configurações):** card "Minha conta — alterar senha" com senha atual +
  nova senha (regras de senha forte com checklist ao vivo) + confirmação. Faz **reautenticação**
  (`reauthenticateWithCredential`) antes de `updatePassword` para evitar erro de sessão antiga.
- **Logo em círculo:** na tela inicial (e no login) a logo passou a ficar dentro de um medalhão
  circular (`.logo-circle`) com anel dourado sutil, em vez de imagem quadrada.
- **Nova regra função na comunidade × pastorais:** a "Função na Comunidade" voltou a participar da
  regra de Coordenação/Assessoria — se for **Coordenação**, a opção Coordenação fica indisponível nas
  pastorais/grupos; se for **Assessoria**, idem para Assessoria (e vice-versa). Implementado
  reincluindo o select no grupo `.funcaoSelect` + listener `change` chamando `verificarFuncoes()`.
- **Status:** concluído.

## 2026-07-15 — Logo oficial, favicon e botão de admin flutuante
- **Arquivos:** `site/assets/img/` (logo.png/jpeg, favicon-32/64.png, apple-touch-icon.png),
  `site/index.html`, `site/login.html`, `styles.css`, favicon em cadastro/verificar/admin, `.gitignore`.
- **Logo oficial da paróquia** (cruz azul/dourada com N. S. de Nazaré) adicionada no topo da **tela
  inicial** e do **login**. Gerados a partir dela: **favicon** (32/64 px) e apple-touch-icon (180 px),
  aplicados em todas as páginas (ícone na aba do navegador).
- **Botão "Entrar como administrador"** (era "Administrador / Dev"): texto simplificado e **movido
  para fora do card**, flutuando discretamente **abaixo** do quadrado inicial (`.btn-admin-float`).
  No card ficam só os dois botões principais (Fazer cadastro / Verificar cadastro).
- Subtítulo do login ajustado para "Acesso restrito à administração".
- `.gitignore`: ignora imagens soltas de WhatsApp na raiz (a logo usada fica em `site/assets/img/`).
- **Status:** concluído.

## 2026-07-15 — Refinamento visual (sério/sofisticado), ícones SVG e responsividade total
- **Arquivos:** `site/assets/css/styles.css` (reescrito), `site/assets/js/utils.js`, `admin.js`, `cadastro.js`,
  e todas as páginas (`index/cadastro/verificar/login/admin.html`).
- **Visual mais sério/sofisticado:** troca do tema "candy" por paleta **índigo profundo + dourado**,
  títulos em serifada elegante (**Spectral**) com corpo em Inter, cantos mais discretos, sombras
  contidas, gradientes suaves. Fundo neutro. Removidos os emojis (visual "infantil").
- **Ícones SVG profissionais** (line icons + glifo oficial do **WhatsApp**) no lugar dos emojis,
  em todos os botões/links (cadastro, verificar, login, painel, comprovante).
- **Alerta de "CPF já cadastrado" movido para o TOPO:** agora aparece logo abaixo do campo de CPF,
  como um cartão de alerta com os dois botões (verificar / avisar administração), e rola à vista.
  Antes ficava no fim do formulário.
- **Responsividade total:** tipografia/espaçamentos fluidos com `clamp()`, inputs em 16px (evita zoom
  no iOS), `.row` empilha em telas ≤560px, abas com rolagem horizontal, colunas de Configurações
  quebram em tablet, modal com padding adaptativo e rolagem, topbar/who quebram linha, `overflow-x:hidden`,
  ajustes para telas ≤380px e para toque (`hover:none`). `viewport-fit=cover` + `env(safe-area-inset)`.
- **Status:** concluído (pendente teste visual real após deploy).

## 2026-07-15 — Redesign completo + loaders (ldrs) + revisão de bugs
- **Arquivos:** `site/assets/css/styles.css` (reescrito), `site/assets/js/utils.js`,
  `site/index.html`, `site/cadastro.html` + `cadastro.js`, `site/verificar.html`,
  `site/login.html` + `login.js`, `site/admin.html` + `admin.js`.
- **Design:** novo design system moderno — fonte **Inter**, paleta índigo/violeta com gradientes,
  fundo com "aurora", cards com sombras suaves, cantos arredondados, **transições/animações fluidas**
  (entrada de container, fade-in de blocos, hover/press nos botões), toasts estilizados com blur.
- **Loaders (biblioteca `ldrs`, dot-wave):** helper `comCarregamento(btn, fn)` em `utils.js` que
  mostra o loader dentro do botão durante a ação e **bloqueia clique duplo** (guarda `data-busy`).
  Aplicado nos botões de ação: enviar cadastro, buscar (verificar), entrar/salvar senha,
  criar admin, excluir cadastro/admin, salvar edição, exportar, baixar PDF, sair. Também loader
  inline ao "Verificando CPF..." e no carregamento inicial do painel. Script ldrs via CDN em cada página.
- **Mudança de layout:** **Data de Nascimento** movida para logo **abaixo do CPF** (1º campo do
  bloco liberado após validar o CPF).
- **Revisão / correções de lógica (vs. `formulario.html` legado):**
  - Removidas duplicações do legado (`verificarFuncoes` definida 2x e 2 listeners `DOMContentLoaded`).
  - **Desacoplada** a "Função na Comunidade" da regra "Coordenação/Assessoria só uma vez" — essa regra
    agora vale só entre as **pastorais** (a função na comunidade é independente).
  - Novas validações no envio: data de nascimento obrigatória e ao menos uma pastoral/grupo.
  - PDF do comprovante agora exporta só o card `#comprovante` (antes incluía os botões).
  - Removidos spinners antigos (`.spinner`) substituídos pelo dot-wave.
- **Nota:** `formulario.html` (raiz) é a versão **legada** (Google Sites/Apps Script) e está
  **superada** pelo site em `site/`. Mantido só como referência; pode ser removido quando quiser.
- **Status:** concluído (pendente teste visual real após deploy/Firebase).

## 2026-07-15 — Exportação de cadastros (Excel e PDF) no painel
- **Arquivos:** `site/admin.html`, `site/assets/js/admin.js`
- **O que mudou:** na aba **Cadastros** foram adicionados os botões **Exportar Excel** e
  **Exportar PDF**. A exportação segue o **filtro de comunidade + busca** atuais: em "Todas as
  comunidades" exporta tudo; selecionando uma comunidade, exporta só ela.
  - Excel (SheetJS/xlsx via CDN): colunas Nome, CPF, Celular, Data de Nascimento, Comunidade,
    Função na Comunidade e Pastoral/Função 1..N (expandido conforme o máximo de pastorais).
  - PDF (jsPDF + autotable via CDN): tabela paisagem com título, comunidade, total e data;
    pastorais reunidas numa coluna "Pastorais / Grupos (Função)".
  - Nome do arquivo: `agentes_<comunidade-ou-todas>_<data>.xlsx|pdf`.
  - Extraída a função `filtrarCadastros()` (reutilizada pela lista e pela exportação).
- **Motivo:** pedido do usuário: admins poderem exportar as listas (todas ou por comunidade).
- **Status:** concluído.

## 2026-07-15 — Projeto versionado e enviado ao GitHub
- **Arquivos:** `.gitignore` (novo), repositório git inicializado.
- **O que mudou:** `git init` + primeiro commit + push para
  **https://github.com/manozx-seven/paroquia-beruri** (branch `main`).
  Criado `.gitignore` que **exclui a planilha de dados pessoais** (`*.xlsx` e a pasta
  "Agentes de Pastoral ... planilha de dados/") — confirmado que não foi enviada.
- **Motivo:** o usuário vai conectar o repositório ao Netlify (deploy automático).
- **Atenção:** a `apiKey` do Firebase fica no `site/assets/js/firebase.js` — isso é normal e seguro
  para apps web Firebase (é identificador público); a proteção real vem das regras do Firestore.
- **Status:** concluído. **Próximo passo do usuário:** no Netlify, "Import from Git" apontando para
  esse repositório (o `netlify.toml` já publica a pasta `site/`).

## 2026-07-15 — Regras de senha forte na troca do primeiro acesso
- **Arquivos:** `site/assets/js/utils.js`, `site/assets/js/login.js`, `site/login.html`, `site/assets/css/styles.css`
- **O que mudou:** na troca de senha do primeiro acesso, a nova senha passa a exigir **senha forte**:
  mín. 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial. Adicionada uma
  **lista visual** que marca ✔/✗ ao vivo conforme digita; o botão "Salvar" só habilita quando todas
  as regras são atendidas E as duas senhas conferem. Validador reutilizável `validarSenhaForte()` +
  constante `REGRAS_SENHA` em `utils.js`.
- **Motivo:** pedido do usuário para forçar senha forte no primeiro acesso.
- **Status:** concluído.

## 2026-07-15 — Chaves do Firebase e ajuste da Parte 5
- **Arquivos:** `site/assets/js/firebase.js`, `SETUP-FIREBASE.md`
- **O que mudou:**
  - `firebase.js`: preenchidas as chaves reais do projeto **paroquia-beruri** (apiKey, authDomain,
    projectId, storageBucket, messagingSenderId, appId). Removido um bloco duplicado colado do Console
    (`import ... "firebase/app"` + segundo `const app`) que causava erro de sintaxe.
  - `SETUP-FIREBASE.md` (Parte 5): deixado explícito que os nomes dos campos são no **plural**
    (`comunidades`, `pastorais`, `funcoes`) e que **cada item é um elemento separado do array**
    (índice 0,1,2...), não um texto único com vírgulas. Comunidade "Matriz" passou a
    "Nossa Senhora de Nazaré (Matriz)" conforme escolha do usuário.
- **Motivo:** dúvida do usuário na Parte 5 e correção do firebase.js quebrado.
- **Status:** concluído. Segue pendente o restante do setup (regras, semear listas, 1º DEV, deploy).

## 2026-07-15 — Nova versão do sistema: Netlify + Firebase (migração)
- **Arquivos (novos):**
  - `site/index.html` — página inicial com texto de boas-vindas + botões (Fazer meu cadastro,
    Verificar meu cadastro, Entrar como Administrador/Dev).
  - `site/cadastro.html` + `site/assets/js/cadastro.js` — formulário (CPF primeiro, máscara e
    validação matemática; se o CPF já existe, trava todos os campos + toast + opções "fui eu /
    não fui eu"). Salva no Firestore. Gera comprovante em PDF.
  - `site/verificar.html` — verificação por **CPF + Data de Nascimento**; botão "Solicitar mudança"
    abre WhatsApp do pároco **(97) 98802-5117** com mensagem pronta.
  - `site/login.html` + `site/assets/js/login.js` — login de ADM/DEV; detecta **primeiro acesso** e
    obriga a cadastrar nova senha.
  - `site/admin.html` + `site/assets/js/admin.js` — painel com 3 abas: **Cadastros** (buscar/editar/
    excluir), **Configurações** (add/editar/remover comunidades, pastorais, funções) e
    **Administradores** (criar novos ADM/DEV; DEV é superadmin). Criação de admin usa app Firebase
    secundário para não deslogar o admin atual.
  - `site/assets/js/firebase.js` — init do Firebase (config placeholder a preencher).
  - `site/assets/js/utils.js` — máscaras, validação de CPF, toast, helpers.
  - `site/assets/css/styles.css` — estilo compartilhado (tema índigo).
  - `netlify.toml` — publica a pasta `site/`.
  - `firestore.rules` — regras de segurança do Firestore.
  - `SETUP-FIREBASE.md` — passo a passo para criar Firebase, semear as listas, criar o 1º DEV e
    publicar no Netlify.
- **O que mudou:** reescrita completa do projeto saindo de Google Sites + Apps Script + Google
  Sheets para **site estático (Netlify) + Firebase (Firestore + Authentication)**.
- **Decisões (confirmadas com o usuário):** Firebase a ser criado (placeholders + guia);
  verificação por CPF+Nascimento; WhatsApp (97) 98802-5117; ADM e DEV editam cadastros e
  configurações, DEV é superadmin (remove ADMs e não é removível por ADM).
- **Status:** código concluído. **Pendente do usuário:** executar o `SETUP-FIREBASE.md`
  (criar projeto Firebase, colar chaves em `firebase.js`, publicar regras, semear `config/listas`,
  criar 1º DEV, deploy no Netlify).
- **Próximos passos / ideias futuras:** segurança forte do "verificar cadastro" via Firebase
  Functions; apagar contas do Auth ao remover admin; migrar dados atuais da planilha para o Firestore.

## 2026-07-15 — Criação da documentação do projeto
- **Arquivos:** `context.md` (novo), `atualizacoes.md` (novo), `CLAUDE.md` (novo)
- **O que mudou:** verificação completa do projeto e criação da documentação base:
  - `context.md`: visão geral, arquitetura (formulário → Apps Script → Google Sheets), regras de
    negócio, listas fixas, estrutura da planilha e pontos de atenção.
  - `atualizacoes.md`: este arquivo, para histórico de mudanças.
  - `CLAUDE.md`: instrução para ler `context.md` e `atualizacoes.md` no início de cada sessão.
- **Motivo:** ter um ponto único de contexto e um histórico rastreável de alterações.
- **Status:** concluído.
- **Observações levantadas na verificação:**
  - Lista de comunidades do formulário tem 9, mas o `.xlsx` só tem 8 abas — falta
    "Divino Espírito Santo" (verificar na planilha online).
  - `verificarFuncoes()` está duplicada no `formulario.html` (candidato a limpeza).
  - Código do Google Apps Script (backend) não está versionado nesta pasta.
