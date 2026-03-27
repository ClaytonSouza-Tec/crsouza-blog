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
9. Analytics para relatorio mensal
10. Gerenciamento de notícias na Timeline
11. Seguranca e privacidade

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

## Gerenciamento de noticias na Timeline

A pagina Timeline oferece uma visualizacao estilo blog para todas as noticias do blog, contem:
- **Timeline vertical**: exibe noticias ordenadas por data (mais recentes primeiro)
- **Atualizacoes recentes**: sidebar mostrando os 5 ultimos artigos
- **Tags interativas**: nuvem de tags para filtrar noticias por categoria
- **Modal de leitura**: clique em qualquer noticia para ler o artigo completo

### Endpoints de noticia

Ingestao e consulta de noticias:

```bash
# Listar todas as noticias (paginado)
GET /api/news?limit=50&offset=0

# Obter noticia por ID
GET /api/news/:id

# Criar nova noticia (requer dados validos)
POST /api/news
Content-Type: application/json
{
  "id": "news-unique-id",
  "title": "Titulo da noticia",
  "content": "Conteudo completo em markdown ou HTML",
  "excerpt": "Resumo para exibicao na timeline",
  "date": "2026-03-27T10:00:00Z",
  "source": "Microsoft News",
  "image": "imagens/card1.png",
  "tags": "tag1, tag2, tag3",
  "featured": true
}

# Deletar noticia
DELETE /api/news/:id
```

### Estrutura da tabela News

Armazenamento em Azure Table Storage:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| PartitionKey | string | Ano-mes (YYYY-MM) para organizacao temporal |
| RowKey | string | ID unico da noticia |
| title | string | Titulo do artigo |
| content | string | Conteudo completo |
| excerpt | string | Resumo/preview |
| date | string | Data ISO 8601 |
| source | string | Fonte (ex: "Microsoft News", "Blog") |
| image | string | URL da imagem principal |
| tags | string | Tags separadas por virgula |
| featured | boolean | Se aparece em destaque |
| author | string | Autor do artigo |
| timestamp | string | Data de criacao/atualizacao no banco |

### Populando noticias de exemplo

Execute localmente para popular dados iniciais:

```bash
# Certifique-se de ter AZURE_STORAGE_CONNECTION_STRING configurado
npm run seed:news
```

Isso cria as noticias example.json nos dados da tabela News do Azure.

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

