export function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeSearchQuery(query: string) {
  const normalized = normalizeQuery(query);
  return normalized.endsWith("ktv") ? normalized : `${normalized} ktv`;
}

