# CRSouza Blog

Blog pessoal com frontend estatico e backend Node.js no Azure, com persistencia em Azure Table Storage e envio de e-mail via Azure Communication Services.

## Sumario

1. Visao geral
2. Infraestrutura Azure (atual)
3. Topologia de comunicacao
4. Estrutura do repositorio
5. Variaveis de ambiente
6. Execucao local
7. Deploy
8. Operacao de newsletter
9. Seguranca e privacidade

## Visao geral

Este projeto roda em modo server-rendered estatico + API:
- Frontend: paginas HTML/CSS/JS servidas pelo mesmo app Node
- Backend: API Express para inscricoes, comentarios e unsubscribe
- Persistencia: Azure Table Storage (tabelas de inscritos e comentarios)
- E-mail: Azure Communication Services Email (confirmacao e newsletter)

Nao ha mais fallback de persistencia local (SQLite/Markdown) no fluxo oficial.

## Infraestrutura Azure (atual)

Componentes principais:
- Azure App Service (Linux, Node.js): hospeda frontend e backend
- Azure Table Storage: armazena inscritos e comentarios
- Azure Table Storage (analytics): armazena visitas e cliques por pagina
- Azure Communication Services Email: envia e-mails transacionais e newsletter
- Custom Domain no App Service: endpoint publico do site

Recursos logicos usados pela aplicacao:
- Tabela de inscritos: `Subscribers` (padrao)
- Tabela de comentarios: `Comments` (padrao)
- Tabela de analytics: `AnalyticsEvents` (padrao)

## Topologia de comunicacao

Fluxo de runtime:
1. Usuario acessa o dominio customizado do blog (HTTPS).
2. Requisicao chega no Azure App Service.
3. Frontend chama endpoints da API (`/api/subscribe`, `/api/comments`).
4. API grava e consulta dados no Azure Table Storage.
5. API envia e-mails pelo Azure Communication Services Email.
6. Usuario recebe confirmacao por e-mail com link de unsubscribe.

Fluxo de newsletter por atualizacao de conteudo:
1. Push na branch `main`.
2. Workflow de deploy publica o app no Azure App Service.
3. Se o commit for `NEWS UPDATES`, o workflow executa o script de newsletter.
4. Script le noticias do carrossel em `index.html`, busca inscritos no Table Storage e envia e-mails pelo ACS Email.

## Estrutura do repositorio

Arquivos e pastas principais:
- `index.html`, `sobre.html`, `dicas.html`, `eventos.html`, `tinho.html`: paginas do site
- `styles.css`: estilo global
- `script.js`: logica de interacao no frontend
- `server.js`: API Express + arquivos estaticos
- `lib/subscribers.js`: acesso ao Azure Table Storage
- `lib/mail-service.js`: envio de e-mail via Azure Communication Services
- `scripts/send-newsletter-on-update.js`: disparo de newsletter
- `.github/workflows/main_app-crsouza-blog.yml`: build/deploy + gatilho de newsletter

## Variaveis de ambiente

Defina no Azure App Service (Configuration > Application settings):

```env
PORT=3000
NODE_ENV=production
AZURE_STORAGE_CONNECTION_STRING=
SUBSCRIBERS_TABLE_NAME=Subscribers
COMMENTS_TABLE_NAME=Comments
ANALYTICS_TABLE_NAME=AnalyticsEvents
AZURE_EMAIL_CONNECTION_STRING=
MAIL_FROM=
BLOG_URL=https://seu-dominio.com
```

Notas:
- Nao publique valores reais de segredo.
- `BLOG_URL` deve apontar para o dominio publico usado pelos usuarios (idealmente o custom domain).

## Execucao local

Pre-requisitos:
- Node.js 20+

Passos:

```bash
npm install
npm start
```

Aplicacao local:
- `http://localhost:3000`

Para executar localmente com API ativa, configure um `.env` com as variaveis acima.

## Deploy

Deploy automatizado via GitHub Actions:
- Workflow: `.github/workflows/main_app-crsouza-blog.yml`
- Trigger: push para `main`
- Etapas: install, build/test (se existirem), deploy no App Service

## Operacao de newsletter

Disparo manual local:

```bash
npm run send:news
```

Regras de envio automatico no CI:
- O script de newsletter roda quando o ultimo commit tem mensagem exata `NEWS UPDATES`.
- O script usa os app settings do App Service para conexao no Table Storage e servico de e-mail.

## Analytics para relatorio mensal

Eventos medidos automaticamente:
- `page_view`: visita por pagina
- `click`: clique em links/botoes
- `comment_submit_attempt` e `comment_submit_success`
- `subscribe_submit_attempt` e `subscribe_submit_success`

Endpoints:
- Ingestao de eventos: `POST /api/analytics/events`
- Relatorio mensal: `GET /api/analytics/reports/monthly?month=YYYY-MM`

Exemplo de consulta do relatorio mensal:

```bash
curl "http://localhost:3000/api/analytics/reports/monthly?month=2026-03"
```

Geracao automatica de relatorio mensal em Markdown:

```bash
npm run report:monthly -- --month=2026-03
```

Campos principais no relatorio:
- `totalEvents`
- `pageViews`
- `uniqueSessions`
- `byPageViews`
- `byEventType`
- `topClicks`
- `conversions.subscribeSubmitSuccess`
- `conversions.commentSubmitSuccess`

## Seguranca e privacidade

Este README e publico e nao contem:
- strings de conexao
- chaves
- IDs de tenant/subscription
- e-mails internos de operacao

Boas praticas recomendadas:
- armazenar segredos somente em GitHub Secrets e App Settings
- habilitar HTTPS only no App Service
- revisar CORS conforme dominio oficial
- auditar periodicamente permissoes de acesso aos recursos Azure
