const { randomUUID } = require("crypto");
const { TableClient } = require("@azure/data-tables");

const STORAGE_CONNECTION_STRING = String(process.env.AZURE_STORAGE_CONNECTION_STRING || "").trim();
const ANALYTICS_TABLE_NAME = String(process.env.ANALYTICS_TABLE_NAME || "AnalyticsEvents").trim();

let analyticsClient = null;

function isAnalyticsConfigured() {
  return Boolean(STORAGE_CONNECTION_STRING);
}

function getAnalyticsClient() {
  if (!analyticsClient) {
    analyticsClient = TableClient.fromConnectionString(STORAGE_CONNECTION_STRING, ANALYTICS_TABLE_NAME);
  }

  return analyticsClient;
}

async function ensureAnalyticsTable() {
  if (!isAnalyticsConfigured()) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING not configured.");
  }

  try {
    await getAnalyticsClient().createTable();
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }
}

function toMonthKey(isoDate) {
  const date = new Date(isoDate || new Date().toISOString());
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function cleanText(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeEventPayload(payload = {}) {
  const timestamp = String(payload.timestamp || new Date().toISOString());

  return {
    timestamp,
    eventType: cleanText(payload.eventType || "unknown", 80),
    pagePath: cleanText(payload.pagePath || "/", 200),
    targetType: cleanText(payload.targetType || "", 80),
    targetId: cleanText(payload.targetId || "", 120),
    targetLabel: cleanText(payload.targetLabel || "", 180),
    referrer: cleanText(payload.referrer || "", 260),
    sessionId: cleanText(payload.sessionId || "", 120),
    source: cleanText(payload.source || "web", 40)
  };
}

async function trackEvent(payload = {}, metadata = {}) {
  const normalized = normalizeEventPayload(payload);
  const partitionKey = toMonthKey(normalized.timestamp);

  await getAnalyticsClient().createEntity({
    partitionKey,
    rowKey: `${Date.now()}-${randomUUID()}`,
    eventType: normalized.eventType,
    pagePath: normalized.pagePath,
    targetType: normalized.targetType,
    targetId: normalized.targetId,
    targetLabel: normalized.targetLabel,
    referrer: normalized.referrer,
    sessionId: normalized.sessionId,
    source: normalized.source,
    userAgent: cleanText(metadata.userAgent || "", 300),
    createdAt: normalized.timestamp
  });
}

function incrementCounter(map, key) {
  const safeKey = String(key || "(empty)");
  map[safeKey] = (map[safeKey] || 0) + 1;
}

function normalizeMonth(monthInput) {
  const value = String(monthInput || "").trim();
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return toMonthKey(new Date().toISOString());
  }

  return value;
}

async function getMonthlyReport(monthInput) {
  const month = normalizeMonth(monthInput);
  const report = {
    month,
    totalEvents: 0,
    pageViews: 0,
    uniqueSessions: 0,
    byEventType: {},
    byPageViews: {},
    topClicks: {},
    conversions: {
      subscribeSubmitSuccess: 0,
      commentSubmitSuccess: 0
    }
  };

  const sessions = new Set();
  const filter = `PartitionKey eq '${month}'`;

  for await (const entity of getAnalyticsClient().listEntities({ queryOptions: { filter } })) {
    report.totalEvents += 1;
    incrementCounter(report.byEventType, entity.eventType);

    if (entity.sessionId) {
      sessions.add(String(entity.sessionId));
    }

    if (entity.eventType === "page_view") {
      report.pageViews += 1;
      incrementCounter(report.byPageViews, entity.pagePath || "/");
    }

    if (entity.eventType === "click") {
      const clickLabel = entity.targetLabel || entity.targetId || entity.pagePath || "unknown";
      incrementCounter(report.topClicks, clickLabel);
    }

    if (entity.eventType === "subscribe_submit_success") {
      report.conversions.subscribeSubmitSuccess += 1;
    }

    if (entity.eventType === "comment_submit_success") {
      report.conversions.commentSubmitSuccess += 1;
    }
  }

  report.uniqueSessions = sessions.size;
  return report;
}

module.exports = {
  isAnalyticsConfigured,
  ensureAnalyticsTable,
  trackEvent,
  getMonthlyReport
};
