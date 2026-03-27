#!/usr/bin/env node

/**
 * Script para popular notícias no Azure Table Storage
 * Executa: node scripts/seed-news.js
 */

const newsData = [
  {
    id: "news-001",
    title: "Accenture impulsiona uso responsável da IA com Azure AI Foundry, reduzindo em até 50% o tempo de lançamento de soluções",
    content: `A Accenture avança em IA generativa com foco em governança, segurança e ganho operacional usando Azure AI Foundry. Com a plataforma, os times conseguem implementar soluções de IA de forma mais rápida e responsável, reduzindo o tempo de projeto em até 50% e mantendo os mais altos padrões de compliance e ethical AI.

Os principais destaques incluem:
- Implementação acelerada de modelos de IA
- Governança centralizada e compliance built-in
- Redução significativa de time-to-market
- Foco em responsible AI e ethical practices

Esta abordagem permite que empresas como a Accenture ofereçam soluções de IA mais seguras e eficientes para seus clientes.`,
    excerpt: "A Accenture avança em IA generativa com foco em governança, segurança e ganho operacional usando Azure AI Foundry.",
    date: "2025-07-22T10:00:00Z",
    source: "Microsoft News",
    image: "imagens/card1.png",
    tags: "ia, azure, ai foundry, accenture, microsoft, governanca",
    featured: true
  },
  {
    id: "news-002",
    title: "Cinco maneiras para PMEs tomarem decisões mais rápidas e inteligentes usando a IA",
    content: `Dicas práticas para pequenas e médias empresas usarem Copilot no Excel e melhorarem análise, controle e tomada de decisão. A inteligência artificial está revolucionando a forma como as PMEs operam, permitindo que startups e pequenas empresas compitam com grandes corporações.

As principais estratégias incluem:
- Automação de análise de dados com Copilot
- Geração de relatórios inteligentes e insights automáticos
- Otimização de processos de negócio
- Tomada de decisão data-driven
- Economia de tempo e redução de erros

Ao implementar IA, as PMEs conseguem focar em estratégia enquanto a tecnologia cuida da operação.`,
    excerpt: "Dicas práticas para pequenas e médias empresas usarem Copilot no Excel e melhorarem análise, controle e tomada de decisão.",
    date: "2025-07-24T10:00:00Z",
    source: "Microsoft News",
    image: "imagens/card2.png",
    tags: "pmes, copilot, excel, ia, produtividade, microsoft",
    featured: true
  },
  {
    id: "news-003",
    title: "Novas soluções do Microsoft Azure com foco em segurança de dados, otimização de redes e desempenho estão disponíveis no Brasil",
    content: `Atualizações no Azure no Brasil trazem recursos para proteger dados, otimizar redes e elevar desempenho em cargas empresariais. Microsoft reforça seu compromisso com a região, oferecendo soluções localizadas que atendem aos requisitos de residência de dados e compliance.

Os destaques das novas soluções:
- Data protection e encryption avançados
- Otimização de performance de rede
- Compliance com legislação brasileira
- Suporte técnico local
- Centros de dados na região

Com essas atualizações, empresas brasileiras podem modernizar sua infraestrutura com confiança e segurança.`,
    excerpt: "Atualizações no Azure no Brasil trazem recursos para proteger dados, otimizar redes e elevar desempenho em cargas empresariais.",
    date: "2025-06-30T10:00:00Z",
    source: "Microsoft News",
    image: "imagens/card3.png",
    tags: "azure, seguranca, dados, redes, desempenho, brasil, microsoft",
    featured: true
  },
  {
    id: "news-004",
    title: "Impacto da IA na Dow: Copilot identifica milhões em economia de custos",
    content: `A Dow usa Copilot e agentes para auditar faturas de frete, encontrar anomalias e liberar economias significativas na operação. Esse caso de uso demonstra como a IA pode transformar processos operacionais tradicionais em vantagens competitivas mensuráveis.

Resultados alcançados:
- Identificação automática de anomalias em faturas
- Redução de custos na cadeia de suprimentos
- Otimização de processos de auditoria
- Economia de milhões de dólares
- Aumento de eficiência operacional

A implementação mostra que a IA não é apenas sobre inovação, mas também sobre otimização e economia real.`,
    excerpt: "A Dow usa Copilot e agentes para auditar faturas de frete, encontrar anomalias e liberar economias significativas na operação.",
    date: "2025-06-25T10:00:00Z",
    source: "Microsoft News",
    image: "imagens/card4.png",
    tags: "dow, copilot, economia, custos, cadeia suprimentos, ia, agentes",
    featured: true
  },
  {
    id: "news-005",
    title: "4 passos para organizar um roadmap DevOps pessoal",
    content: `Como transformar objetivos soltos em entregas reais com rotina, foco e métricas simples. Em um mercado competitivo, profissionais precisam de um plano claro para evoluir continuamente.

Passo 1: Definir objetivos SMART
- Específicos
- Mensuráveis
- Alcançáveis
- Realistas
- Limitados por tempo

Passo 2: Quebrar em sprints de 2-4 semanas
Passo 3: Acompanhar progresso com métricas
Passo 4: Ajustar baseado em resultados

Com esse método, você transforma sonhos vágos em realidade prática.`,
    excerpt: "Como transformar objetivos soltos em entregas reais com rotina, foco e métricas simples.",
    date: "2026-03-23T10:00:00Z",
    source: "Blog",
    image: "imagens/card1.png",
    tags: "devops, roadmap, carreira, planejamento, produtividade",
    featured: false
  },
  {
    id: "news-blog-001",
    title: "Como usar GitHub Actions para automação de CI/CD",
    content: `GitHub Actions é uma ferramenta poderosa para automatizar seu fluxo de trabalho de desenvolvimento. Neste artigo, vamos explorar como usar GitHub Actions para criar um pipeline de CI/CD completo e eficiente.

## O que é CI/CD?

Continuous Integration (CI) e Continuous Deployment (CD) são práticas essenciais no desenvolvimento moderno:
- **CI**: Automatiza testes e builds a cada commit
- **CD**: Automatiza deploy para produção após validações

## Configurando seu primeiro workflow

1. **Crie um arquivo .github/workflows/main.yml**
   - Define quando o workflow executa (em push, pull request, etc)
   - Lista os jobs que serão executados
   
2. **Configure seus steps**
   - Checkout do código
   - Instalar dependências
   - Rodas testes
   - Build da aplicação
   - Deploy para produção

3. **Use Actions da comunidade**
   - Git checkout: actions/checkout@v3
   - Setup Node: actions/setup-node@v3
   - Deploy: ações customizadas para seu servidor

## Exemplo prático

Um workflow básico para Node.js:
- Clone o repositório
- Instale dependências com npm install
- Execute testes com npm test
- Faça build com npm run build
- Deploy automático se tudo passar

## Benefícios

- Reduz erros manuais
- Acelera desenvolvimento
- Garante qualidade consistente
- Economiza tempo do time
- Integração perfeita com GitHub

Com GitHub Actions, você automatiza repetições e ganha tempo para focar no que realmente importa: criar bom código!`,
    excerpt: "Aprenda como automatizar seu fluxo de trabalho com GitHub Actions para CI/CD eficiente e confiável.",
    date: "2026-03-25T14:30:00Z",
    source: "Blog",
    image: "imagens/card2.png",
    tags: "github, ci/cd, automação, devops, actions, github actions",
    featured: false
  },
  {
    id: "news-blog-002",
    title: "Boas práticas com Git: branches, commits e pull requests",
    content: `Git é a ferramenta fundamental para qualquer desenvolvedor. Neste guia, vou compartilhar as boas práticas que aprendi ao trabalhar em projetos reais e scale.

## Estratégia de Branching

A escolha de como organizar suas branches é crucial para manter o repositório limpo:

**Git Flow** (para projetos com releases)
- main: código em produção
- develop: desenvolvimento contínuo
- feature/: novas funcionalidades
- hotfix/: correções urgentes
- release/: preparação de releases

**Trunk-Based Development** (para continuous deployment)
- main: único branch principal
- feature branches curtas (< 1 dia)
- Deploy contínuo da main

## Commits semânticos

Mensagens de commit claras facilitam a história do projeto:
- feat: nova funcionalidade
- fix: correção de bug
- docs: documentação
- style: formatação, sem mudança lógica
- refactor: refatoração sem novas features
- test: adição ou atualização de testes
- chore: atualização de dependências

Exemplo: "feat: adicionar autenticação via OAuth"

## Pull Requests eficazes

Pull Requests são onde o conhecimento é compartilhado:
- Escopo pequeno e focado
- Descrição clara do que foi feito
- Checklist antes de enviar
- Pelo menos 1 revisor
- Testes passando antes do merge

## Dicas essenciais

1. Faça rebase antes de mergear
2. Use squash para commits pequenos
3. Delete branches obsoletos
4. Mantenha histórico limpo
5. Documente decisões importantes

Um bom fluxo Git melhora a colaboração e reduz bugs em produção!`,
    excerpt: "Descubra as melhores práticas de Git para um desenvolvimento colaborativo e organizado.",
    date: "2026-03-20T10:00:00Z",
    source: "Blog",
    image: "imagens/card3.png",
    tags: "git, github, versionamento, devops, colabolação, boas práticas",
    featured: false
  },
  {
    id: "news-blog-003",
    title: "Introdução ao Azure App Service: deploy sem preocupações",
    content: `Azure App Service é o serviço de hospedagem PaaS da Microsoft que transforma a forma como você faz deploy. Neste artigo, vou te mostrar como começar e por que você deveria estar usando.

## O que é Azure App Service?

Azure App Service é uma plataforma gerenciada para construir e hospedar web apps, APIs e mobile backends.

**Características principais:**
- Suporte a múltiplas linguagens (.NET, Node.js, Python, Java, PHP, Ruby)
- Escalabilidade automática
- CI/CD integrado com GitHub Actions
- Domínios customizados e SSL gratuito
- Staging slots para testes antes de produção
- Backup e restore automático

## Criando seu primeiro App Service

1. **No portal Azure**
   - Crie um novo App Service
   - Escolha seu stack de runtime
   - Selecione um plano de pricing

2. **Configure seu repositório**
   - Conecte seu GitHub
   - Escolha a branch para deploy
   - Defina configurações de build

3. **Deploy automático**
   - A cada push na branch, seu app é deployado
   - Você vê o status na aba "Deployments"
   - Rollback rápido se necessário

## Configurações essenciais

- **Connection Strings**: banco de dados, storage, etc
- **App Settings**: variáveis de ambiente
- **Authentication**: integração com Azure AD, Google, GitHub
- **CORS**: políticas de origem cruzada
- **SSL Certificates**: HTTPS automático

## Escalabilidade

Com App Service, você não se preocupa com servidores:
- Escalabilidade horizontal automática
- Aumento de recursos em minutos
- Balanceamento de carga automático
- Monitoramento integrado

## Exemplo: Deploy de Node.js

```
npm install
npm start (porta em process.env.PORT)
Deploy automático via GitHub Actions
Seu app está online em minutos!
```

Azure App Service remove a complexidade de DevOps iniciante e deixa você focar em código!`,
    excerpt: "Descubra como hostear suas aplicações sem complexidade com Azure App Service.",
    date: "2026-03-18T09:00:00Z",
    source: "Blog",
    image: "imagens/card1.png",
    tags: "azure, app service, paas, deploy, cloud, microsoft",
    featured: false
  },
  {
    id: "news-blog-004",
    title: "Azure Table Storage: armazenamento escalável e simples",
    content: `Azure Table Storage é um banco NoSQL gerenciado perfeito para aplicações que precisam de armazenamento simples e escalável.

## Por que Azure Table Storage?

**Cenários ideais:**
- Armazenar dados estruturados sem schema rígido
- Aplicações que crescem rapidamente
- Quando você quer evitar a complexidade de SQL
- Custos baixos com escalabilidade garantida
- Operações de leitura/escrita em massa

## Conceitos principais

**Accounts & Tables**
- Account Storage: seu container de dados
- Table: similar a uma tabela SQL, mas sem schema
- Entity: linha de dados (como um documento)

**Chaves: Partition & Row**
- PartitionKey: agrupa dados para distribuição
- RowKey: identifica único dentro da partição
- Juntos formam a chave primária

Exemplo:
- PartitionKey: "2026-03" (mês)
- RowKey: "evento-123" (id único)

## Estrutura de dados

Diferente de SQL, você define apenas o que precisa:
```
Entity {
  PartitionKey: "2026-03",
  RowKey: "news-001",
  title: "Meu artigo",
  content: "...",
  tags: "azure, storage",
  timestamp: Date.now()
}
```

## CRUD básico

**Create**: TableClient.upsertEntity(entity)
**Read**: TableClient.getEntity(pk, rk)
**Update**: TableClient.upsertEntity(entity, 'Replace')
**Delete**: TableClient.deleteEntity(pk, rk)

## Queries eficientes

Sempre use PartitionKey nas queries:
```
filter: "PartitionKey eq '2026-03'"
```

Evite scans completos - defina boas partition keys!

## Scaling automático

- Suporta petabytes de dados
- Latência consistente < 100ms
- Replicação automática entre datacenters
- Você só paga o que usa

## Comparativo: SQL vs Table Storage

**Use SQL quando:**
- Precisa de queries complexas
- Tem dados altamente relacionados
- Precisa de transações multi-tabelas

**Use Table Storage quando:**
- Dados planos e independentes
- Escalabilidade é crítica
- Custos reduzidos são prioridade
- Schemas variam entre entidades

Azure Table Storage alimenta aplicações em escala global com simplicidade e custo reduzido!`,
    excerpt: "Entenda como usar Azure Table Storage para armazenamento NoSQL simples e escalável.",
    date: "2026-03-15T11:30:00Z",
    source: "Blog",
    image: "imagens/card2.png",
    tags: "azure, table storage, nosql, banco dados, cloud, armazenamento",
    featured: false
  }
];

async function seedNews() {
  const baseUrl = process.env.API_URL || "http://localhost:3000";

  console.log(`📰 Populando notícias no ${baseUrl}...\n`);

  for (const news of newsData) {
    try {
      const response = await fetch(`${baseUrl}/api/news`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: news.id,
          title: news.title,
          content: news.content,
          excerpt: news.excerpt,
          date: news.date,
          source: news.source,
          image: news.image,
          tags: news.tags,
          featured: news.featured
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`❌ Erro ao criar notícia "${news.title}":`, error);
      } else {
        console.log(`✅ Notícia criada: ${news.title}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao conectar com a API: ${error.message}`);
      process.exit(1);
    }
  }

  console.log("\n✨ Todas as notícias foram populadas!");
}

seedNews();
