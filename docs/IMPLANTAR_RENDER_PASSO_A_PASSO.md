# Colocar o site no ar — guia bem simples (Render)

Eu **não consigo** entrar na sua conta do Render nem no GitHub por você (precisa ser **você** com e-mail e senha). O que dá para fazer é seguir esta lista, na ordem, sem saber programação.

## O que você vai usar

O site **Render** (de graça no plano básico) guarda uma cópia do seu projeto do GitHub e deixa ele rodando na internet.

Este repositório já tem um ficheiro **`render.yaml`**: ele diz ao Render para criar **duas coisas**:

1. Uma **base de dados PostgreSQL** (grátis) — é onde ficam utilizadores e metas (não se perdem quando o site faz *deploy* outra vez).
2. Um **Web Service** Node.js — é o site que as pessoas abrem no browser.

O Render também **cria sozinho** a variável **`JWT_SECRET`** (não precisa de inventar nada).

---

## Passo 1 — Conta no Render

1. Abra [https://render.com](https://render.com)  
2. Registe-se (pode usar **“Sign in with GitHub”** — é o mais fácil)

---

## Passo 2 — Dar permissão ao Render no GitHub

Quando o Render pedir, **autorize** o acesso ao GitHub e marque o repositório **`Sistema-Controle-Metas`** (ou “All repositories”, se preferir).

---

## Passo 3 — Criar tudo a partir do Blueprint

1. No painel do Render, clique **New +**  
2. Escolha **Blueprint**  
3. Selecione o repositório **`fabiana-arch/Sistema-Controle-Metas`** (ou o nome certo da sua cópia)  
4. Confirme: o Render vai ler o **`render.yaml`** e propor criar a base de dados + o site  
5. Clique para **criar / aplicar** (Apply / Create)

Espere o **primeiro deploy** (pode levar **5 a 15 minutos** na primeira vez).

---

## Passo 4 — Abrir o link do site

1. No Render, abra o **Web Service** (nome parecido com `sistema-controle-metas`)  
2. No topo há um endereço tipo **`https://sistema-controle-metas.onrender.com`**  
3. Abra esse link no Chrome ou Edge — deve aparecer a página de **Entrar / Criar conta**

---

## Plano gratuito — duas coisas a saber

1. **O site “adormece”** se ninguém abrir durante **15 minutos**. A primeira pessoa a entrar pode esperar cerca de **1 minuto** até o site acordar. É normal no plano grátis.  
2. A **base de dados PostgreSQL grátis** do Render **expira ao fim de 30 dias** (política deles). Antes disso, ou **muda para um plano pago** da base de dados, ou **exporta / faz cópia** dos dados, ou aceita recriar a base ao fim desse período.

---

## Se o build falhar

- Abra **Logs** no Web Service e copie as últimas linhas vermelhas.  
- Erros com **`better-sqlite3`** costumam resolver-se garantindo **Node 20** (o `render.yaml` já define `NODE_VERSION`).

---

## Não usou Blueprint? (criação manual)

1. **New → PostgreSQL** → plano **Free** → anote o nome da base.  
2. **New → Web Service** → mesmo repositório → **Root** na raiz.  
   - **Build:** `npm install`  
   - **Start:** `npm start`  
3. Em **Environment** do Web Service, adicione:  
   - **`DATABASE_URL`** → no menu, escolha **Link** / **From database** e a base que criou (o Render preenche a *connection string*).  
   - **`JWT_SECRET`** → pode colar duas vezes um código de [https://www.uuidgenerator.net](https://www.uuidgenerator.net) (texto longo).

Não precisa de definir **`PORT`** — o Render define sozinho.

---

## Resumo

| O quê | Onde |
|--------|------|
| Código | GitHub (já tem o `render.yaml`) |
| Site + base | Render → **Blueprint** |
| Segredo JWT | Gerado pelo Render no Blueprint (ou colado manualmente) |
| Abrir o sistema | URL `.onrender.com` do Web Service |

Se algo bloquear num passo concreto (por exemplo “não aparece Blueprint”), diga **em que passo** está e o **texto do erro** que aparece no ecrã ou nos Logs.
