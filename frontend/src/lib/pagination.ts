export function getPagination(searchParams: Record<string, string | string[] | undefined>) {
  const rawPage = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const rawPageSize = Array.isArray(searchParams.pageSize)
    ? searchParams.pageSize[0]
    : searchParams.pageSize;

  const page = Math.max(1, Number(rawPage || 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(rawPageSize || 20) || 20));
  const limit = pageSize;
  const offset = (page - 1) * pageSize;

  return { page, pageSize, limit, offset };
}

export function buildSearchParams(
  currentParams: Record<string, string | string[] | undefined>,
  updates: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  
  // Add existing params
  Object.entries(currentParams).forEach(([key, value]) => {
    if (value && !updates.hasOwnProperty(key)) {
      const val = Array.isArray(value) ? value[0] : value;
      if (val) params.set(key, val);
    }
  });
  
  // Add/override with updates
  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  });
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

