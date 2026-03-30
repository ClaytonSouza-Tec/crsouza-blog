const { randomUUID } = require("crypto");
const { TableClient } = require("@azure/data-tables");

const STORAGE_CONNECTION_STRING = String(process.env.AZURE_STORAGE_CONNECTION_STRING || "").trim();
const SUBSCRIBERS_TABLE_NAME = String(process.env.SUBSCRIBERS_TABLE_NAME || "Subscribers").trim();
const COMMENTS_TABLE_NAME = String(process.env.COMMENTS_TABLE_NAME || "Comments").trim();

let subscribersClient = null;
let commentsClient = null;

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

function formatDateAndTime(dateInput) {
  const date = new Date(dateInput);
  return {
    datePart: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date),
    timePart: new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium" }).format(date)
  };
}

async function initializeDataStore() {
  if (!isAzureStorageConfigured()) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING não configurada. Este projeto usa apenas Azure Table Storage.");
  }

  await ensureTable(getSubscribersClient());
  await ensureTable(getCommentsClient());
}

async function upsertSubscriber({ name, email, createdAt, updatedAt }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

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
}

async function listSubscribers(options = {}) {
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

async function countSubscribers() {
  let count = 0;
  for await (const _ of getSubscribersClient().listEntities({
    queryOptions: { select: ["RowKey"] }
  })) {
    count++;
  }
  return count;
}

async function removeSubscriber(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return buildSubscriberNotFoundResult(normalizedEmail);
  }

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

async function addComment({ name, text, createdAt }) {
  const isoDate = String(createdAt || new Date().toISOString());

  await getCommentsClient().createEntity({
    partitionKey: "comments",
    rowKey: `${Date.now()}-${randomUUID()}`,
    name: String(name || "").trim(),
    text: String(text || "").trim(),
    createdAt: isoDate
  });
}

async function listComments() {
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

async function closeDataStore() {
  return Promise.resolve();
}

module.exports = {
  isAzureStorageConfigured,
  initializeDataStore,
  upsertSubscriber,
  isDuplicateSubscriberError,
  listSubscribers,
  countSubscribers,
  removeSubscriber,
  addComment,
  listComments,
  closeDataStore
};
