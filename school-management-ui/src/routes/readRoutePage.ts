export function readRoutePage<T extends string>(
  prefix: string,
  pages: Array<{ page: T }>,
  fallback: T,
): T {
  const route = window.location.hash.replace(prefix, "").replace(/^\/+/, "");
  return pages.some((item) => item.page === route) ? route as T : fallback;
}
