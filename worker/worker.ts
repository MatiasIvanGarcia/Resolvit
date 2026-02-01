export interface Env {
  ASSETS: Fetcher;
}

function isValidCode(code: string) {
  return /^[A-Za-z0-9_-]{4,32}$/.test(code);
}

function redirect(to: string, status = 302) {
  return new Response(null, {
    status,
    headers: {
      location: to,
      "cache-control": "no-store",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ✅ Short link: /i/:code  -> /invite/:code
    if (url.pathname.startsWith("/i/")) {
      const code = url.pathname.split("/").pop() || "";
      if (!isValidCode(code)) {
        return redirect("/expired"); // o "/?invalid=1" si preferís
      }
      return redirect(`/invite/${encodeURIComponent(code)}`, 302);
    }

    // (Después vamos a agregar /api/* acá)

    // ✅ Assets (front)
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 404) return res;

    // ✅ SPA fallback -> index.html (para /invite/ABC, /create, etc.)
    const indexUrl = new URL(url);
    indexUrl.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
  },
};
