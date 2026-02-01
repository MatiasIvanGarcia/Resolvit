export interface Env {
  ASSETS: Fetcher;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  APP_BASE_URL: string;
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

async function getPlanByCode(env: Env, code: string) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/rpc/get_public_plan_by_code`,
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ p_code: code }),
    }
  );

  if (!res.ok) return null;
  return res.json();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ✅ Short link real: /i/:code
    if (url.pathname.startsWith("/i/")) {
      const code = url.pathname.split("/").pop() || "";

      if (!isValidCode(code)) {
        return redirect("/expired");
      }

      const data = await getPlanByCode(env, code);

      if (!data || data.status !== "ok") {
        return redirect("/expired");
      }

      return redirect(`/invite/${encodeURIComponent(code)}`);
    }

    // 🔜 API pública después: /api/public/...

    // ✅ Assets
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 404) return res;

    // ✅ SPA fallback
    const indexUrl = new URL(url);
    indexUrl.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
  },
};
