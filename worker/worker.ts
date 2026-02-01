export interface Env {
  ASSETS: Fetcher;
}

function isValidCode(code: string) {
  return /^[A-Za-z0-9_-]{4,32}$/.test(code);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Placeholder para después (cuando conectemos Supabase)
    // /i/:code  -> short link
    if (url.pathname.startsWith("/i/")) {
      const code = url.pathname.split("/").pop() || "";
      if (!isValidCode(code)) {
        return new Response("Link inválido", { status: 400 });
      }
      return new Response(
        `Shortlink OK. Próximo paso: validar code=${code} en Supabase y redirigir.`,
        { status: 200 }
      );
    }

    // Placeholder API pública
    if (url.pathname.startsWith("/api/")) {
      return new Response(
        JSON.stringify({ status: "ok", message: "API placeholder" }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // Static assets (tu front)
    // Si pedís una ruta SPA (ej /invite/ABC123) y no existe archivo real,
    // devolvemos index.html.
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 404) return res;

    // Fallback SPA -> index.html
    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
  },
};
