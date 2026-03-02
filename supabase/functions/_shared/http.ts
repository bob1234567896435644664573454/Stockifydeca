export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    },
  });
}

export function parsePath(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length <= 1) return "/";
  return `/${parts.slice(1).join("/")}`;
}

export function getPagination(url: URL): { limit: number; offset: number } {
  const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("page_size") ?? 25), 1), 100);
  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function requestId(req: Request): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}
