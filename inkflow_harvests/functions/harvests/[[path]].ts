// Pages Function: reverse proxy for the AI Core API.
//
// Browser -> https://harvests.pages.dev/harvests/*   (same-origin, no CORS)
//          -> this Function (runs in the harvests Pages project, account B)
//          -> https://harvests-ai-core-api.inkflowapp.workers.dev/*  (AI Core worker, same account)
//          The /harvests mount is STRIPPED here, so the worker sees the real
//          path /{tenant}/{resource} — tenant is always segment [0].
//
// Why a proxy instead of binding D1 directly: the AI Core worker already
// implements read-harvests-db -> write-memory -> serve, and is verified working
// in production. Reusing it keeps the frontend thin and avoids duplicating logic.

const AI_CORE_URL = "https://harvests-ai-core-api.inkflowapp.workers.dev";

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
  // Strip the /harvests mount: worker receives /{tenant}/{resource}, so the
  // tenant is always path segment [0] (e.g. /harvests/memory or
  // /competitors:tattoo/import/from-shopify).
  const target = `${AI_CORE_URL}/${rest}${url.search}`;

  // Forward the original request but drop the host header (must point at AI Core).
  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };

  // Stream the body for non-GET/HEAD requests (e.g. POST /harvests/import/pull-harvests).
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
