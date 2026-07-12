// Pages Function: reverse proxy for the Cloud API (harvests-cloud-api Worker).
//
// Browser -> https://harvests.pages.dev/api/*   (same-origin, no CORS)
//          -> this Function (runs in the harvests Pages project)
//          -> https://harvests-cloud-api.inkflowapp.workers.dev/api/*  (Cloud API Worker)
//
// This resolves every relative fetch('/api/...') from the frontend to the Worker
// without CORS issues, and keeps traffic Cloudflare->Cloudflare (GFW-safe). It mirrors
// the existing functions/harvests/[[path]].ts proxy that handles /harvests/*.

const API_URL = "https://harvests-cloud-api.inkflowapp.workers.dev";

interface PagesContext {
  request: Request;
  params: Record<string, string | string[]>;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, params } = context;

  const segments = params.path;
  const rest = Array.isArray(segments)
    ? segments.join("/")
    : (segments ?? "");
  const url = new URL(request.url);
  const target = `${API_URL}/api/${rest}${url.search}`;

  // Forward the original request but drop the host header (must point at the API Worker).
  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };

  // Stream the body for non-GET/HEAD requests.
  if (request.method !== "GET" && request.method !== "HEAD") {
    (init as unknown as { body: ReadableStream; duplex: string }).body = request.body as ReadableStream;
    (init as unknown as { duplex: string }).duplex = "half";
  }

  try {
    const upstream = await fetch(target, init);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: upstream.headers,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "proxy_failed", detail: String(e) }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
}
