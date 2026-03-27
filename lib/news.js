const { TableClient } = require("@azure/data-tables");

const NEWS_TABLE_NAME = process.env.NEWS_TABLE_NAME || "News";

function isNewsConfigured() {
  return !!process.env.AZURE_STORAGE_CONNECTION_STRING;
}

function getNewsClient() {
  return TableClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING,
    NEWS_TABLE_NAME
  );
}

async function ensureNewsTable() {
  if (!isNewsConfigured()) return;
  
  try {
    const client = getNewsClient();
    // Test if table exists by trying to list entities
    for await (const entity of client.listEntities({ maxPageSize: 1 })) {
      break;
    }
  } catch (error) {
    // Table might not exist, but we'll handle this gracefully
    console.log(`News table may not exist yet: ${error.message}`);
  }
}

async function upsertNews(id, data) {
  if (!isNewsConfigured()) {
    throw new Error("Azure Storage not configured");
  }

  const client = getNewsClient();
  
  // Use publication date as partition key (YYYY-MM format) for easy monthly queries
  const date = new Date(data.date || new Date());
  const partitionKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  
  const entity = {
    partitionKey,
    rowKey: id,
    title: data.title || "",
    content: data.content || "",
    excerpt: data.excerpt || "",
    date: data.date || new Date().toISOString(),
    source: data.source || "Blog",
    image: data.image || "",
    tags: data.tags || "",
    author: data.author || "Clayton Rodrigues Souza",
    featured: data.featured || false,
    url: data.url || "",
    timestamp: new Date().toISOString()
  };

  return await client.upsertEntity(entity, "Replace");
}

async function listNews(limit = 50, offset = 0) {
  if (!isNewsConfigured()) {
    return [];
  }

  const client = getNewsClient();
  const news = [];
  let count = 0;

  try {
    // Get all entities and sort by date (partition key gives us some ordering)
    const iterator = client.listEntities();
    
    for await (const entity of iterator) {
      if (count >= offset + limit) break;
      if (count >= offset) {
        news.push({
          id: entity.rowKey,
          title: entity.title,
          content: entity.content,
          excerpt: entity.excerpt,
          date: entity.date,
          source: entity.source,
          image: entity.image,
          tags: entity.tags,
          author: entity.author,
          featured: entity.featured,
          url: entity.url || ""
        });
      }
      count++;
    }
  } catch (error) {
    console.error(`Error listing news: ${error.message}`);
  }

  // Sort by date descending (most recent first)
  return news.sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function getNewsById(id) {
  if (!isNewsConfigured()) {
    return null;
  }

  const client = getNewsClient();

  try {
    // We need to search for the entity since we don't know its partition key
    const entities = [];
    
    for await (const entity of client.listEntities()) {
      if (entity.rowKey === id) {
        return {
          id: entity.rowKey,
          title: entity.title,
          content: entity.content,
          excerpt: entity.excerpt,
          date: entity.date,
          source: entity.source,
          image: entity.image,
          tags: entity.tags,
          author: entity.author,
          featured: entity.featured,
          url: entity.url || ""
        };
      }
    }
  } catch (error) {
    console.error(`Error getting news by id: ${error.message}`);
  }

  return null;
}

async function deleteNews(id) {
  if (!isNewsConfigured()) {
    throw new Error("Azure Storage not configured");
  }

  const client = getNewsClient();

  try {
    // Find the entity to get its partition key
    for await (const entity of client.listEntities()) {
      if (entity.rowKey === id) {
        await client.deleteEntity(entity.partitionKey, entity.rowKey);
        return { deleted: true };
      }
    }
    return { deleted: false, error: "News not found" };
  } catch (error) {
    console.error(`Error deleting news: ${error.message}`);
    throw error;
  }
}

async function getFeaturedNews(limit = 4) {
  const allNews = await listNews(100);
  return allNews.filter((n) => n.featured).slice(0, limit);
}

async function searchNews(query) {
  if (!query) return [];

  const allNews = await listNews(100);
  const lowerQuery = query.toLowerCase();

  return allNews.filter(
    (n) =>
      n.title.toLowerCase().includes(lowerQuery) ||
      n.content.toLowerCase().includes(lowerQuery) ||
      (n.tags && n.tags.toLowerCase().includes(lowerQuery))
  );
}

module.exports = {
  isNewsConfigured,
  ensureNewsTable,
  upsertNews,
  listNews,
  getNewsById,
  deleteNews,
  getFeaturedNews,
  searchNews
};
