# CRSouza Blog

Site pessoal com foco em Cloud, DevOps, IA aplicada e conteúdo educacional.

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

2. Inicie o servidor:

```bash
npm start
```

3. Abra no navegador:

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
