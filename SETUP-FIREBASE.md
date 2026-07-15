# Passo a passo — Firebase + Netlify

Este guia liga o site novo (pasta `site/`) ao Firebase e publica no Netlify.
Siga na ordem. Não precisa saber programar.

---

## Parte 1 — Criar o projeto no Firebase

1. Acesse **https://console.firebase.google.com** e faça login com sua conta Google.
2. Clique em **"Criar um projeto"** (ou "Add project").
   - Nome sugerido: `paroquia-beruri`.
   - Pode desativar o Google Analytics (não é necessário).
3. Aguarde criar e clique em **Continuar**.

## Parte 2 — Ativar o banco de dados (Firestore)

1. No menu à esquerda: **Criação → Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Escolha o local `southamerica-east1` (São Paulo) e avance.
4. Selecione **"Iniciar no modo de produção"** e clique em **Criar**.
5. Abra a aba **Regras (Rules)** e **substitua todo o conteúdo** pelo texto do arquivo
   `firestore.rules` (na raiz deste projeto). Clique em **Publicar**.

## Parte 3 — Ativar o login (Authentication)

1. No menu: **Criação → Authentication → Começar**.
2. Na lista de provedores, clique em **E-mail/senha**, **ative** e salve.

## Parte 4 — Registrar o app web e pegar as chaves

1. No menu, clique na engrenagem ⚙️ → **Configurações do projeto**.
2. Role até **"Seus apps"** e clique no ícone **`</>` (Web)**.
3. Dê um apelido (ex.: `site`) e clique em **Registrar app** (não precisa de Hosting).
4. Vai aparecer um bloco `const firebaseConfig = { ... }`. **Copie os valores.**
5. Abra o arquivo **`site/assets/js/firebase.js`** e cole os valores no lugar dos placeholders
   (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).

## Parte 5 — Criar as listas iniciais (comunidades, pastorais, funções)

1. No Firestore, aba **Dados**, clique em **Iniciar coleção**.
2. ID da coleção: `config`  → **Avançar**.
3. ID do documento: `listas`.
4. Adicione **3 campos do tipo `array`**. ATENÇÃO a duas coisas:
   - Os nomes dos campos precisam ser **EXATAMENTE** estes (no plural, `funcoes` sem cedilha/acento):
     **`comunidades`**, **`pastorais`**, **`funcoes`**. Se errar o nome, a lista aparece vazia no site.
   - Cada item é **um elemento separado** do array (índice 0, 1, 2...). NÃO cole tudo num item só
     separado por vírgulas. Ao criar o campo `array`, clique em **"Adicionar item"** uma vez para
     cada valor (cada item tipo `string`).

**Campo `comunidades`** (um item por linha):

```
0 = Nossa Senhora de Nazaré (Matriz)
1 = Divino Espírito Santo
2 = São José
3 = Bom Pastor
4 = São Francisco
5 = Santa Luzia
6 = Santo Antônio
7 = São Pedro
8 = São Raimundo
```

**Campo `pastorais`** (um item por linha):

```
0 = Batismo
1 = COMIPA
2 = Pastoral da Catequese
3 = Cerimoniários
4 = Coroinhas
5 = Cáritas
6 = Pastoral do Dízimo
7 = Grupo Esperança Viva
8 = Infância Missionária
9 = Pastoral da Liturgia
10 = Ministros Extraordinários
11 = Pastoral Esperança
12 = Pastoral Familiar
13 = Pastoral da Criança
14 = Pastoral da Juventude
15 = Pastoral da Pessoa Idosa
```

**Campo `funcoes`** (um item por linha):

```
0 = Coordenação
1 = Assessoria
2 = Membro
```

5. Salve. (Depois de logado no painel, você pode editar tudo isso pela aba **Configurações**.)

## Parte 6 — Criar o primeiro usuário DEV (você)

1. **Authentication → Users → Adicionar usuário**: informe seu e-mail e uma senha provisória. Criar.
2. Copie o **UID** que aparece na lista de usuários.
3. Vá em **Firestore → Dados → Iniciar coleção**: ID da coleção `admins`.
4. ID do documento: **cole o UID** copiado.
5. Adicione os campos:
   - `email` (string) → seu e-mail
   - `role` (string) → `dev`
   - `mustChangePassword` (boolean) → `true`
6. Salve. Pronto: ao entrar no site com esse e-mail, ele pedirá para você criar uma nova senha.

> Depois, dentro do sistema (aba **Administradores**), você e outros admins podem criar novos
> administradores sem mexer no Console.

## Parte 7 — Publicar no Netlify

**Opção simples (arrastar):**

1. Acesse **https://app.netlify.com** e faça login.
2. Menu **Sites → Add new site → Deploy manually**.
3. **Arraste a pasta `site/`** para a área indicada. Pronto, o site fica no ar com um endereço
   `algo.netlify.app` (dá para trocar o nome e ligar um domínio depois).

**Opção com GitHub (atualiza sozinho a cada mudança):**

1. Suba este projeto para um repositório no GitHub.
2. No Netlify: **Add new site → Import from Git**, escolha o repositório.
3. O arquivo `netlify.toml` já define que a pasta publicada é `site/`. Confirme e faça o deploy.

## Parte 8 — Autorizar o domínio do Netlify no Firebase

1. Copie o endereço final do site (ex.: `paroquiaberuri.netlify.app`).
2. No Firebase: **Authentication → Settings → Authorized domains → Add domain** e cole o endereço.
   (Isso permite o login funcionar no site publicado.)

---

## Pronto! Como usar

- **Paroquianos:** abrem o site → **Fazer meu cadastro** (ou **Verificar meu cadastro**).
- **Administração:** botão **Entrar como Administrador / Dev** → painel com Cadastros,
  Configurações e Administradores.

## Observações

- A conferência de "CPF + Data de Nascimento" em *Verificar meu cadastro* é feita no site.
  Qualquer pessoa que saiba o CPF exato consegue apenas *checar se existe* — os dados só aparecem
  com a data de nascimento correta. Para segurança total seria preciso Firebase **Functions**
  (fora do escopo atual). Registre no `atualizacoes.md` se um dia quiser evoluir isso.
- Ao **excluir um administrador** pelo painel, o acesso é bloqueado (o doc em `admins` some), mas a
  conta de login continua no **Authentication** até você apagá-la manualmente no Console.
