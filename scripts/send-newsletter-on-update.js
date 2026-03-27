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

function extractCarouselNews() {
  const homePage = fs.readFileSync(HOME_PAGE_PATH, "utf8");
  const matches = Array.from(
    homePage.matchAll(
      /<article class="carousel-slide[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<div class="slide-content">\s*<p class="slide-meta">([\s\S]*?)<\/p>\s*<h2>([\s\S]*?)<\/h2>\s*<p>([\s\S]*?)<\/p>[\s\S]*?<\/article>/g
    )
  );

  if (matches.length < 4) {
    throw new Error("Não foi possível localizar as 4 notícias do carrossel em index.html.");
  }

  return matches.slice(0, 4).map((match) => ({
    image: String(match[1] || "").trim(),
    imageAlt: stripHtml(match[2]),
    meta: stripHtml(match[3]),
    title: stripHtml(match[4]),
    summary: stripHtml(match[5])
  }));
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
  if (commitMessage !== "NEWS UPDATES") {
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

  const newsItems = extractCarouselNews();

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
  process.exit(0);
});