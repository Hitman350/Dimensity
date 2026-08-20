export function extractMatchSnippet(
  content: string,
  query: string,
  radius = 50,
): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  const lowerContent = normalized.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) {
    return normalized.length > 100
      ? `${normalized.slice(0, 100)}...`
      : normalized;
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(normalized.length, index + query.length + radius);
  let snippet = normalized.slice(start, end);
  if (start > 0) snippet = `...${snippet}`;
  if (end < normalized.length) snippet = `${snippet}...`;
  return snippet;
}
