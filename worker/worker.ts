export interface Env {
  ASSETS: Fetcher;
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
    const url = new URL(request.url);

    // =========================
    // API pública (Worker proxy)
    // =========================

    // GET /api/public/plan/:code
    if (request.method === "GET" && url.pathname.startsWith("/api/public/plan/")) {
      const code = url.pathname.split("/").pop() || "";
      if (!isValidCode(code)) return json({ status: "invalid_code" }, 400);

      // cache corto (30s) si querés: podés activar cache-control public
      const { ok, data } = await supabaseRpc(env, "get_public_plan_by_code", { p_code: code });
      if (!ok) return json({ status: "error" }, 502);

      return json(data, 200, { "cache-control": "public, max-age=30" });
    }

    // POST /api/public/submit/:code
    // body: { answers: { [questionId]: optionId } }
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

      if (!ok) return json({ status: "error" }, 502);
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
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 404) return res;

    const indexUrl = new URL(url);
    indexUrl.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
  },
};
