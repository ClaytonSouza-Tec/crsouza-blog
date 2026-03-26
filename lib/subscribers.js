const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "blog.db");
const SUBSCRIBERS_LOG_PATH = path.join(DATA_DIR, "inscricoes.md");
const COMMENTS_LOG_PATH = path.join(DATA_DIR, "comentarios.md");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function openDatabase() {
  ensureDataDir();
  return new sqlite3.Database(DB_PATH);
}

function initializeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `
        CREATE TABLE IF NOT EXISTS subscribers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
        `,
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    });
  });
}

function runQuery(db, sql, params = []) {
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

function allQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
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
  ensureDataDir();

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

function ensureCommentsLogFile() {
  ensureDataDir();

  if (fs.existsSync(COMMENTS_LOG_PATH)) {
    return;
  }

  const header = [
    "# Comentários da Comunidade",
    "",
    "| Nome | Data | Hora | Comentário |",
    "| --- | --- | --- | --- |",
    ""
  ].join("\n");

  fs.writeFileSync(COMMENTS_LOG_PATH, header, "utf8");
}

function appendCommentToMarkdown(name, dateInput, commentText) {
  ensureCommentsLogFile();

  const { datePart, timePart } = formatDateAndTime(dateInput);
  const row = `| ${escapeMarkdownCell(name)} | ${datePart} | ${timePart} | ${escapeMarkdownCell(commentText)} |\n`;

  fs.appendFileSync(COMMENTS_LOG_PATH, row, "utf8");
}

function getCommentsFromMarkdown() {
  ensureCommentsLogFile();

  const content = fs.readFileSync(COMMENTS_LOG_PATH, "utf8");
  const lines = content.split("\n");
  
  return lines
    .map((line) => {
      const trimmed = line.trim();
      // Pula linhas vazias, cabeçalhos e linhas de separador
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("|") && trimmed.includes("---")) {
        return null;
      }
      if (trimmed.startsWith("|")) {
        const parts = trimmed.split("|").map((p) => p.trim()).filter((p) => p);
        if (parts[0] === "Nome" && parts[1] === "Data") {
          return null;
        }
        if (parts.length >= 4) {
          return {
            name: parts[0],
            date: parts[1],
            time: parts[2],
            text: parts.slice(3).join(" ")
          };
        }
      }
      return null;
    })
    .filter(Boolean)
    .reverse();
}

async function listSubscribers(db, options = {}) {
  const params = [];
  let sql = `
    SELECT name, email, created_at AS createdAt, updated_at AS updatedAt
    FROM subscribers
  `;

  if (options.onlyEmail) {
    sql += " WHERE email = ?";
    params.push(String(options.onlyEmail).trim().toLowerCase());
  }

  sql += " ORDER BY updated_at DESC";
  return allQuery(db, sql, params);
}

module.exports = {
  DATA_DIR,
  DB_PATH,
  SUBSCRIBERS_LOG_PATH,
  COMMENTS_LOG_PATH,
  openDatabase,
  initializeDatabase,
  runQuery,
  closeDatabase,
  appendSubscriberToMarkdown,
  appendCommentToMarkdown,
  getCommentsFromMarkdown,
  listSubscribers
};
