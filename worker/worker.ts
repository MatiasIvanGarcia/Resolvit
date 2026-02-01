export interface Env {
  ASSETS?: Fetcher; // 👈 opcional a propósito (para no crashear)
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

function isValidCode(code: string) {
  return /^[A-Za-z0-9_-]{4,32}$/.test(code);
}

function json(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function redirect(to: string, status = 302) {
  return new Response(null, {
    status,
    headers: { location: to, "cache-control": "no-store" },
  });
}

async function supabaseRpc(env: Env, fn: string, body: any) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { ok: res.ok, status: res.status, data };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      // ✅ Health check rápido
      if (url.pathname === "/health") {
        return json({
          status: "ok",
          hasAssets: Boolean(env.ASSETS),
          hasSupabaseUrl: Boolean(env.SUPABASE_URL),
          hasAnonKey: Boolean(env.SUPABASE_ANON_KEY),
        });
      }

      // =========================
      // API pública (Worker proxy)
      // =========================
      if (request.method === "GET" && url.pathname.startsWith("/api/public/plan/")) {
        const code = url.pathname.split("/").pop() || "";
        if (!isValidCode(code)) return json({ status: "invalid_code" }, 400);

        const { ok, data } = await supabaseRpc(env, "get_public_plan_by_code", { p_code: code });
        if (!ok) return json({ status: "rpc_error", detail: data }, 502);

        return json(data, 200, { "cache-control": "public, max-age=30" });
      }

      if (request.method === "POST" && url.pathname.startsWith("/api/public/submit/")) {
        const code = url.pathname.split("/").pop() || "";
        if (!isValidCode(code)) return json({ status: "invalid_code" }, 400);

        let payload: any = null;
        try {
          payload = await request.json();
        } catch {
          return json({ status: "bad_json" }, 400);
        }

        const answers = payload?.answers;
        if (!answers || typeof answers !== "object") {
          return json({ status: "missing_answers" }, 400);
        }

        const userAgent = request.headers.get("user-agent") || null;

        const { ok, data } = await supabaseRpc(env, "submit_public_submission", {
          p_code: code,
          p_answers: answers,
          p_user_agent: userAgent,
        });

        if (!ok) return json({ status: "rpc_error", detail: data }, 502);
        return json(data, 200);
      }

      // =========================
      // Short link /i/:code
      // =========================
      if (url.pathname.startsWith("/i/")) {
        const code = url.pathname.split("/").pop() || "";
        if (!isValidCode(code)) return redirect("/expired");

        const { ok, data } = await supabaseRpc(env, "get_public_plan_by_code", { p_code: code });
        if (!ok || !data || data.status !== "ok") return redirect("/expired");

        return redirect(`/invite/${encodeURIComponent(code)}`);
      }

      // =========================
      // Assets + SPA fallback
      // =========================
      if (!env.ASSETS) {
        // 👇 en vez de crashear y mostrar 1101, devolvemos un error entendible
        return html(
          `<h1>Worker error: ASSETS binding missing</h1>
           <p>El Worker no tiene disponible env.ASSETS. Revisá wrangler.jsonc (assets.directory) y el deploy.</p>
           <p>Probá /health para ver el estado.</p>`,
          500
        );
      }

      const res = await env.ASSETS.fetch(request);
      if (res.status !== 404) return res;

      // SPA fallback -> index.html
      const indexUrl = new URL(url);
      indexUrl.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    } catch (err: any) {
      // 👇 evita Error 1101: devolvemos HTML con detalle
      const msg = (err && (err.stack || err.message)) ? String(err.stack || err.message) : String(err);
      return html(
        `<h1>Worker exception</h1><pre style="white-space:pre-wrap">${escapeHtml(msg)}</pre>`,
        500
      );
    }
  },
};

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
