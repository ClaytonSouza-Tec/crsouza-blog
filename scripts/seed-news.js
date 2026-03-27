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
