#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const {
  initializeDataStore,
  listSubscribers
} = require("../lib/subscribers");
const { isMailConfigured, sendNewsUpdateEmail } = require("../lib/mail-service");

const REPO_ROOT = path.join(__dirname, "..");
const HOME_PAGE_PATH = path.join(REPO_ROOT, "index.html");
const TIPS_PAGE_PATH = path.join(REPO_ROOT, "dicas.html");
const CACHE_DIR = path.join(REPO_ROOT, ".cache");
const LAST_SENT_COMMIT_PATH = path.join(CACHE_DIR, "last-newsletter-commit.txt");

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function runGitCommand(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8"
  }).trim();
}

function stripHtml(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFirstMatch(content, pattern) {
  const match = content.match(pattern);
  return match ? stripHtml(match[1]) : "";
}

function normalizeRelativeFilePath(value) {
  return String(value || "")
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/^\.\//, "")
    .replace(/\\/g, "/");
}

function extractArticleLinksFromPage(pagePath) {
  if (!fs.existsSync(pagePath)) {
    return [];
  }

  const html = fs.readFileSync(pagePath, "utf8");
  const matches = Array.from(html.matchAll(/href="([^"]*artigo-[^"]+\.html)"/gi));

  return matches
    .map((match) => normalizeRelativeFilePath(match[1]))
    .filter((href) => /^artigo-[a-z0-9\-]+\.html$/i.test(href));
}

function getTrackedArticlePaths() {
  const indexArticles = extractArticleLinksFromPage(HOME_PAGE_PATH);
  const dicasArticles = extractArticleLinksFromPage(TIPS_PAGE_PATH);
  return Array.from(new Set([...indexArticles, ...dicasArticles]));
}

function buildArticleMetaFromFile(relativePath) {
  const normalizedPath = String(relativePath || "").replace(/\\/g, "/").trim();
  const absolutePath = path.join(REPO_ROOT, normalizedPath);

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  const articleHtml = fs.readFileSync(absolutePath, "utf8");
  const title = extractFirstMatch(articleHtml, /<h1>([\s\S]*?)<\/h1>/i);
  const summary = extractFirstMatch(articleHtml, /<p class="artigo-subtitulo">([\s\S]*?)<\/p>/i);
  const meta = extractFirstMatch(articleHtml, /<span class="artigo-data">([\s\S]*?)<\/span>/i);
  const imageMatch = articleHtml.match(/<img[^>]*class="artigo-imagem"[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/i);
  const image = imageMatch ? String(imageMatch[1] || "").trim() : "";
  const imageAlt = imageMatch ? stripHtml(imageMatch[2]) : "";

  if (!title) {
    return null;
  }

  return {
    title,
    summary,
    meta,
    image,
    imageAlt,
    url: `${relativePath}`
  };
}

function getChangedFilesForCommit(commitHash) {
  const envChangedFiles = String(process.env.NEWSLETTER_CHANGED_FILES || "").trim();
  if (envChangedFiles) {
    return envChangedFiles
      .split(/\r?\n|,/g)
      .map((item) => normalizeRelativeFilePath(item))
      .filter(Boolean);
  }

  const safeHash = String(commitHash || "").trim();
  if (!safeHash || safeHash.startsWith("manual-")) {
    return [];
  }

  let output = "";
  try {
    output = runGitCommand(["show", "--name-only", "--pretty=format:", safeHash]);
  } catch (error) {
    console.error("[NEWSLETTER] Falha ao ler arquivos alterados via git show:", error.message || error);
    return [];
  }

  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/g)
    .map((item) => normalizeRelativeFilePath(item))
    .filter(Boolean);
}

function extractUpdatedNewsFromCommit(commitHash) {
  const changedFiles = getChangedFilesForCommit(commitHash);
  const trackedArticlePaths = getTrackedArticlePaths();
  const trackedSet = new Set(trackedArticlePaths);

  console.log(`[NEWSLETTER] Artigos monitorados (index + dicas): ${trackedArticlePaths.length}.`);
  console.log(`[NEWSLETTER] Arquivos alterados identificados: ${changedFiles.length}.`);

  const updatedTrackedArticleFiles = changedFiles.filter((filePath) => trackedSet.has(filePath));
  console.log(`[NEWSLETTER] Artigos monitorados alterados no commit: ${updatedTrackedArticleFiles.length}.`);

  const uniqueArticleFiles = Array.from(new Set(updatedTrackedArticleFiles));
  const items = uniqueArticleFiles
    .map((filePath) => buildArticleMetaFromFile(filePath))
    .filter(Boolean);

  console.log(`[NEWSLETTER] Noticias elegiveis para envio: ${items.length}.`);

  return items;
}

function getOnlyEmailArgument() {
  const argument = process.argv.find((item) => item.startsWith("--only="));
  if (!argument) {
    return "";
  }

  return argument.split("=").slice(1).join("=").trim().toLowerCase();
}

function getCommitMessage() {
  const envCommitMessage = String(process.env.NEWSLETTER_COMMIT_MESSAGE || "").trim();
  if (envCommitMessage) {
    return envCommitMessage;
  }

  return runGitCommand(["log", "-1", "--pretty=%s"]);
}

function getCommitHash() {
  const envCommitHash = String(process.env.NEWSLETTER_COMMIT_HASH || "").trim();
  if (envCommitHash) {
    return envCommitHash;
  }

  return runGitCommand(["rev-parse", "HEAD"]);
}

function shouldSendForCommit(forceMode) {
  if (forceMode) {
    return {
      shouldSend: true,
      commitHash: `manual-${Date.now()}`,
      reason: "Envio manual forçado."
    };
  }

  const commitMessage = getCommitMessage();
  const normalizedCommitMessage = String(commitMessage || "").trim().toUpperCase();
  if (!normalizedCommitMessage.includes("NEWS UPDATE")) {
    return {
      shouldSend: false,
      reason: `Commit ignorado: '${commitMessage}'.`
    };
  }

  const commitHash = getCommitHash();

  if (fs.existsSync(LAST_SENT_COMMIT_PATH)) {
    const lastSentCommit = fs.readFileSync(LAST_SENT_COMMIT_PATH, "utf8").trim();
    if (lastSentCommit === commitHash) {
      return {
        shouldSend: false,
        reason: "Newsletter já enviada para esse commit.",
        commitHash
      };
    }
  }

  return {
    shouldSend: true,
    commitHash,
    reason: "Commit NEWS UPDATES detectado."
  };
}

async function main() {
  ensureCacheDir();
  const forceMode = process.argv.includes("--force");
  const onlyEmail = getOnlyEmailArgument();
  const commitDecision = shouldSendForCommit(forceMode);

  if (!commitDecision.shouldSend) {
    console.log(`[NEWSLETTER] ${commitDecision.reason}`);
    return;
  }

  if (!isMailConfigured()) {
    console.log("[NEWSLETTER] Serviço de e-mail não configurado. Nenhum e-mail será enviado.");
    return;
  }

  let newsItems = [];

  if (forceMode) {
    const trackedArticlePaths = getTrackedArticlePaths();
    newsItems = trackedArticlePaths
      .map((filePath) => buildArticleMetaFromFile(filePath))
      .filter(Boolean);
    console.log(`[NEWSLETTER] Modo forçado: enviando todos os ${newsItems.length} artigos monitorados.`);
  } else {
    newsItems = extractUpdatedNewsFromCommit(commitDecision.commitHash);
  }

  if (!newsItems.length) {
    console.log("[NEWSLETTER] Nenhum artigo monitorado (index + dicas) foi atualizado no commit NEWS UPDATE(S). Envio ignorado.");
    return;
  }

  try {
    await initializeDataStore();
    const subscribers = await listSubscribers({ onlyEmail });

    if (!subscribers.length) {
      console.log("[NEWSLETTER] Nenhum inscrito encontrado para envio.");
      if (!forceMode && commitDecision.commitHash) {
        fs.writeFileSync(LAST_SENT_COMMIT_PATH, `${commitDecision.commitHash}\n`, "utf8");
      }
      return;
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const subscriber of subscribers) {
      try {
        const result = await sendNewsUpdateEmail({
          name: subscriber.name,
          email: subscriber.email,
          newsItems
        });

        if (result.enabled) {
          sentCount += 1;
        }
      } catch (error) {
        failedCount += 1;
        console.error(`[NEWSLETTER] Falha ao enviar para ${subscriber.email}:`, error.message || error);
      }
    }

    if (failedCount === 0 && !forceMode && commitDecision.commitHash) {
      fs.writeFileSync(LAST_SENT_COMMIT_PATH, `${commitDecision.commitHash}\n`, "utf8");
    }

    console.log(`[NEWSLETTER] Envio concluído. Sucessos: ${sentCount}. Falhas: ${failedCount}.`);
  } catch (error) {
    console.error("[NEWSLETTER] Erro durante o envio:", error.message || error);
    throw error;
  }
}

main().catch((error) => {
  console.error("[NEWSLETTER] Erro fatal:", error.message || error);
  process.exit(1);
});