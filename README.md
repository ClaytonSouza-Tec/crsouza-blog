# CRSouza Blog

Site pessoal com foco em Cloud, DevOps, IA aplicada e conteúdo educacional.

## Status atual da hospedagem

O projeto deixou de ter GitHub Pages como ambiente principal.

O cenário recomendado agora é:
- Frontend e backend publicados no Azure App Service
- Comentários e inscrições persistidos no Azure Table Storage
- E-mails enviados pelo Azure Communication Services Email

## Variáveis de ambiente para Azure App Service

Configure estas variáveis no App Service:

```env
PORT=3000
AZURE_STORAGE_CONNECTION_STRING=
SUBSCRIBERS_TABLE_NAME=Subscribers
COMMENTS_TABLE_NAME=Comments
AZURE_EMAIL_CONNECTION_STRING=
MAIL_FROM=
NODE_ENV=production
```

Observação:
- Se `AZURE_STORAGE_CONNECTION_STRING` não estiver definido, o projeto ainda consegue usar SQLite/markdown localmente.
- Se `AZURE_EMAIL_CONNECTION_STRING` não estiver definido, o projeto ainda aceita fallback SMTP local via `SMTP_*`.

Este projeto foi estruturado para funcionar em dois modos:
- Modo estatico (GitHub Pages)
- Modo completo com backend Node.js (Express + SQLite)

## Visao geral para iniciantes

Pense no projeto em 3 camadas:
- HTML: estrutura visual das paginas (textos, blocos, links, formularios)
- CSS: estilo da interface (cores, layout, responsividade)
- JavaScript: comportamento dinamico (carrossel, busca, comentarios e inscricoes)

Quando voce abre o site no navegador, o HTML monta a pagina, o CSS estiliza e o arquivo `script.js` ativa as funcionalidades interativas.

## Estrutura principal do projeto

- `index.html`: pagina inicial com carrossel, cards, formulario e links
- `sobre.html`: pagina com biografia, formacao e certificacoes
- `tinho.html`: pagina do avatar Tinho com video e redes sociais
- `eventos.html`: agenda e destaque de eventos
- `dicas.html`: dicas tecnicas e exibicao de comentarios
- `styles.css`: estilos globais
- `script.js`: logica front-end
- `server.js`: backend local para endpoint de inscricao
- `data/`: banco e arquivo de registro local (modo backend)

## Funcionalidades implementadas

### 1) Navegacao entre paginas
- Menu principal com links internos entre as paginas do site.
- Funciona no GitHub Pages por usar caminhos relativos.

### 2) Carrossel na home
- Avanco automatico a cada 5 segundos.
- Botoes anterior/proximo e indicadores.

### 3) Busca global
- Campo "Buscar no blog" filtra conteudo visivel por texto e tags.
- Funciona em todas as paginas que possuem itens com classe `searchable-item`.

### 4) Comentarios da comunidade
- Comentarios enviados na home sao armazenados no `localStorage`.
- Pagina `dicas.html` le esse armazenamento e renderiza os comentarios.
- Sem backend obrigatorio para comentarios.

### 5) Inscricao de novidades
- No modo backend local: envia para `POST /api/subscribe` e grava no SQLite.
- No GitHub Pages: salva localmente no navegador (fallback automatico) para manter a funcionalidade ativa mesmo sem API.

### 6) Video de apresentacao do Tinho
- Video configurado para iniciar automaticamente (`autoplay`, `muted`, `playsinline`).

## Compatibilidade GitHub Pages

O GitHub Pages hospeda arquivos estaticos. Portanto:
- HTML/CSS/JS funcionam normalmente.
- Rotas de API (como `/api/subscribe`) nao existem no Pages.

Para resolver isso, o front-end ja foi preparado com fallback local para inscricoes.

## Como executar localmente (modo estatico)

Basta abrir `index.html` no navegador.

Opcionalmente, use uma extensao como Live Server no VS Code para recarregamento automatico.

## Como executar localmente (modo backend completo)

Pre-requisitos:
- Node.js instalado

Passos:
1. Instale dependencias:

```bash
npm install
```

2. Crie o arquivo `.env` com base no `.env.example` e preencha a configuracao SMTP.

Exemplo para Brevo SMTP:

```env
PORT=3000
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-login-smtp-brevo
SMTP_PASS=sua-chave-smtp-brevo
MAIL_FROM=CRSouza Blog <seu-remetente-verificado@seudominio.com>
MAIL_REPLY_TO=seu-remetente-verificado@seudominio.com
MAIL_NOTIFY_TO=
BLOG_URL=http://localhost:3000/index.html
```

Observacoes sobre o SMTP:
- `MAIL_FROM` deve usar um remetente valido e, idealmente, verificado no Brevo.
- `MAIL_NOTIFY_TO` e opcional. Se preenchido, recebe aviso a cada nova inscricao.
- `BLOG_URL` define o link usado no e-mail de noticias para "Ler no Blog".
- O backend envia um e-mail de confirmacao para o usuario inscrito.

## Envio automatico de noticias

O projeto agora envia e-mails em 2 cenarios:
- Quando o visitante se inscreve no blog pelo formulario.
- Quando as 4 noticias do carrossel da home forem atualizadas e voce fizer um commit com a mensagem exata `NEWS UPDATES`.

Para o disparo automatico no commit, o envio oficial acontece no GitHub Actions durante o push para `main`, usando as configuracoes do Azure Web App.

O hook local em `.githooks/post-commit` fica desativado por padrao para evitar disparo acidental com configuracoes locais de SMTP. Ele so roda se a variavel `ENABLE_LOCAL_NEWSLETTER_HOOK=true` estiver definida no ambiente local.

Ative localmente com:

```bash
git config core.hooksPath .githooks
```

Regras do envio de noticias:
- O workflow roda apenas quando o commit mais recente se chama `NEWS UPDATES`.
- Ele lê as 4 noticias do carrossel da home e envia para todos os inscritos.
- O assunto do e-mail e `Novas noticias no CRSouza Blog`.

Para testar manualmente sem depender de commit:

```bash
npm run send:news
```

3. Inicie o servidor:

```bash
npm start
```

4. Abra no navegador:

- `http://localhost:3000`

## Publicacao no GitHub Pages

1. Suba o projeto para o repositorio GitHub.
2. No GitHub, abra:
   - Settings
   - Pages
3. Em Source, selecione:
   - Deploy from a branch
   - Branch: `main`
   - Folder: `/ (root)`
4. Salve e aguarde a URL publica ser gerada.

## Observacoes importantes

- Comentarios e inscricoes locais (fallback) ficam salvos no navegador de quem acessa.
- Isso significa que os dados nao sao compartilhados entre usuarios no modo estatico.
- Para centralizar dados entre todos os visitantes, use backend (ex.: `server.js`) hospedado separadamente.

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- Node.js
- Express
- SQLite

## Resumo da validacao realizada

Foi feita uma revisao tecnica do projeto para uso em GitHub e GitHub Pages:
- Estrutura de navegacao validada
- Referencias locais (`href`/`src`) validadas
- Fluxos principais de interface revisados (carrossel, busca, comentarios, video)
- Fluxo de inscricao adaptado para funcionamento tambem em hospedagem estatica

Projeto pronto para publicacao no GitHub Pages e uso local com Node.js.
