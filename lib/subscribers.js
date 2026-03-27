const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const sqlite3 = require("sqlite3").verbose();
const { TableClient } = require("@azure/data-tables");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "blog.db");
const SUBSCRIBERS_LOG_PATH = path.join(DATA_DIR, "inscricoes.md");
const COMMENTS_LOG_PATH = path.join(DATA_DIR, "comentarios.md");

const STORAGE_CONNECTION_STRING = String(process.env.   AZURE_STORAGE_CONNECTION_STRING || "").trim();
const SUBSCRIBERS_TABLE_NAME = String(process.env.SUBSCRIBERS_TABLE_NAME || "Subscribers").trim();
const COMMENTS_TABLE_NAME = String(process.env.COMMENTS_TABLE_NAME || "Comments").trim();

let localDb = null;
let subscribersClient = null;
let commentsClient = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function isAzureStorageConfigured() {
  return Boolean(STORAGE_CONNECTION_STRING);
}

function buildDuplicateSubscriberError(email) {
  const error = new Error("E-mail já inscrito.");
  error.code = "SUBSCRIBER_ALREADY_EXISTS";
  error.email = String(email || "").trim().toLowerCase();
  return error;
}

function isDuplicateSubscriberError(error) {
  return String(error?.code || "").trim().toUpperCase() === "SUBSCRIBER_ALREADY_EXISTS";
}

function buildSubscriberNotFoundResult(email) {
  return {
    removed: false,
    email: String(email || "").trim().toLowerCase()
  };
}

function getSubscribersClient() {
  if (!subscribersClient) {
    subscribersClient = TableClient.fromConnectionString(STORAGE_CONNECTION_STRING, SUBSCRIBERS_TABLE_NAME);
  }

  return subscribersClient;
}

function getCommentsClient() {
  if (!commentsClient) {
    commentsClient = TableClient.fromConnectionString(STORAGE_CONNECTION_STRING, COMMENTS_TABLE_NAME);
  }

  return commentsClient;
}

async function ensureTable(client) {
  try {
    await client.createTable();
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }
}

function openLocalDatabase() {
  ensureDataDir();

  if (!localDb) {
    localDb = new sqlite3.Database(DB_PATH);
  }

  return localDb;
}

function initializeLocalDatabase(db) {
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

function runLocalQuery(db, sql, params = []) {
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

function allLocalQuery(db, sql, params = []) {
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

function closeLocalDatabase(db) {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      if (db === localDb) {
        localDb = null;
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
      if (!trimmed || trimmed.startsWith("#") || (trimmed.startsWith("|") && trimmed.includes("---"))) {
        return null;
      }

      if (trimmed.startsWith("|")) {
        const parts = trimmed.split("|").map((part) => part.trim()).filter(Boolean);
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

async function initializeDataStore() {
  if (isAzureStorageConfigured()) {
    await ensureTable(getSubscribersClient());
    await ensureTable(getCommentsClient());
    return;
  }

  await initializeLocalDatabase(openLocalDatabase());
  ensureSubscribersLogFile();
  ensureCommentsLogFile();
}

async function upsertSubscriber({ name, email, createdAt, updatedAt }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (isAzureStorageConfigured()) {
    try {
      await getSubscribersClient().createEntity({
        partitionKey: "subscribers",
        rowKey: normalizedEmail,
        name: String(name || "").trim(),
        email: normalizedEmail,
        createdAt: String(createdAt || updatedAt || new Date().toISOString()),
        updatedAt: String(updatedAt || createdAt || new Date().toISOString())
      });
    } catch (error) {
      if (error.statusCode === 409) {
        throw buildDuplicateSubscriberError(normalizedEmail);
      }

      throw error;
    }

    return;
  }

  const db = openLocalDatabase();
  const initialCreatedAt = String(createdAt || updatedAt || new Date().toISOString());
  const nextUpdatedAt = String(updatedAt || createdAt || new Date().toISOString());

  try {
    await runLocalQuery(
      db,
      `
        INSERT INTO subscribers (name, email, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `,
      [String(name || "").trim(), normalizedEmail, initialCreatedAt, nextUpdatedAt]
    );
  } catch (error) {
    if (String(error.code || "").toUpperCase() === "SQLITE_CONSTRAINT") {
      throw buildDuplicateSubscriberError(normalizedEmail);
    }

    throw error;
  }

  appendSubscriberToMarkdown(name, normalizedEmail, nextUpdatedAt);
}

async function listSubscribers(options = {}) {
  if (isAzureStorageConfigured()) {
    const subscribers = [];
    const onlyEmail = String(options.onlyEmail || "").trim().toLowerCase();

    if (onlyEmail) {
      try {
        const entity = await getSubscribersClient().getEntity("subscribers", onlyEmail);
        subscribers.push({
          name: entity.name,
          email: entity.email,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt
        });
      } catch (error) {
        if (error.statusCode !== 404) {
          throw error;
        }
      }

      return subscribers;
    }

    for await (const entity of getSubscribersClient().listEntities()) {
      subscribers.push({
        name: entity.name,
        email: entity.email,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt
      });
    }

    return subscribers.sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
  }

  const db = openLocalDatabase();
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
  return allLocalQuery(db, sql, params);
}

async function removeSubscriber(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return buildSubscriberNotFoundResult(normalizedEmail);
  }

  if (isAzureStorageConfigured()) {
    try {
      await getSubscribersClient().deleteEntity("subscribers", normalizedEmail);
      return { removed: true, email: normalizedEmail };
    } catch (error) {
      if (error.statusCode === 404) {
        return buildSubscriberNotFoundResult(normalizedEmail);
      }

      throw error;
    }
  }

  const db = openLocalDatabase();
  const result = await runLocalQuery(
    db,
    `
      DELETE FROM subscribers
      WHERE email = ?
    `,
    [normalizedEmail]
  );

  if (!result.changes) {
    return buildSubscriberNotFoundResult(normalizedEmail);
  }

  return { removed: true, email: normalizedEmail };
}

async function addComment({ name, text, createdAt }) {
  const isoDate = String(createdAt || new Date().toISOString());

  if (isAzureStorageConfigured()) {
    await getCommentsClient().createEntity({
      partitionKey: "comments",
      rowKey: `${Date.now()}-${randomUUID()}`,
      name: String(name || "").trim(),
      text: String(text || "").trim(),
      createdAt: isoDate
    });
    return;
  }

  appendCommentToMarkdown(name, isoDate, text);
}

async function listComments() {
  if (isAzureStorageConfigured()) {
    const comments = [];

    for await (const entity of getCommentsClient().listEntities()) {
      const { datePart, timePart } = formatDateAndTime(entity.createdAt);
      comments.push({
        name: entity.name,
        text: entity.text,
        date: datePart,
        time: timePart,
        createdAt: entity.createdAt
      });
    }

    return comments.sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
  }

  return getCommentsFromMarkdown();
}

async function closeDataStore() {
  if (!isAzureStorageConfigured()) {
    await closeLocalDatabase(localDb);
  }
}

module.exports = {
  DATA_DIR,
  DB_PATH,
  SUBSCRIBERS_LOG_PATH,
  COMMENTS_LOG_PATH,
  isAzureStorageConfigured,
  initializeDataStore,
  upsertSubscriber,
  isDuplicateSubscriberError,
  listSubscribers,
  removeSubscriber,
  addComment,
  listComments,
  closeDataStore
};
