const path = require("path");
const fs = require("fs");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();

require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "blog.db");
const SUBSCRIBERS_LOG_PATH = path.join(DATA_DIR, "inscricoes.md");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
});

app.use(express.json());
app.use(express.static(__dirname));

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDateAndTime(dateInput) {
  const date = new Date(dateInput);
  return {
    datePart: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date),
    timePart: new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium" }).format(date)
  };
}

function escapeMarkdownCell(text) {
  return String(text || "").replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

function ensureSubscribersLogFile() {
  if (fs.existsSync(SUBSCRIBERS_LOG_PATH)) {
    return;
  }

  const header = [
    "# Inscricoes no Blog",
    "",
    "| Nome | E-mail | Data | Hora |",
    "| --- | --- | --- | --- |",
    ""
  ].join("\n");

  fs.writeFileSync(SUBSCRIBERS_LOG_PATH, header, "utf8");
}

function appendSubscriberToMarkdown(name, email, dateInput) {
  ensureSubscribersLogFile();

  const { datePart, timePart } = formatDateAndTime(dateInput);
  const row = `| ${escapeMarkdownCell(name)} | ${escapeMarkdownCell(email)} | ${datePart} | ${timePart} |\n`;

  fs.appendFileSync(SUBSCRIBERS_LOG_PATH, row, "utf8");
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve(this);
    });
  });
}

app.post("/api/subscribe", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();

  if (!name || !email) {
    res.status(400).json({ error: "Nome e e-mail são obrigatórios." });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: "E-mail inválido." });
    return;
  }

  const now = new Date().toISOString();
  const nowDate = new Date(now);

  try {
    await runQuery(
      `
      INSERT INTO subscribers (name, email, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email)
      DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
      `,
      [name, email, now, now]
    );

    appendSubscriberToMarkdown(name, email, nowDate);

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Erro ao processar inscricao:", error.message || error);
    res.status(500).json({ error: "Falha ao cadastrar inscrição." });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
});
