export interface Env {
  ASSETS?: Fetcher; // opcional para no crashear
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

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAuthToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

function randCode(len = 7) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin confusos
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
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

// REST proxy (con token de usuario para que aplique RLS)
async function supabaseRest(env: Env, path: string, init: RequestInit, userToken?: string) {
  const headers: Record<string, string> = {
    apikey: env.SUPABASE_ANON_KEY,
    "content-type": "application/json",
    ...(init.headers as any),
  };
  if (userToken) headers.Authorization = `Bearer ${userToken}`;

  const res = await fetch(`${env.SUPABASE_URL}${path}`, { ...init, headers });

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
      // API privada (builder) - requiere login
      // =========================

      // POST /api/private/plan { title, person_name }
      if (request.method === "POST" && url.pathname === "/api/private/plan") {
        const token = getAuthToken(request);
        if (!token) return json({ status: "unauthorized" }, 401);

        const body = await request.json().catch(() => null);
        if (!body?.title) return json({ status: "missing_title" }, 400);

        const payload = {
          title: body.title,
          person_name: body.person_name ?? null,
          status: "draft",
        };

        const { ok, data } = await supabaseRest(
          env,
          `/rest/v1/plans?select=id,title,person_name,status,start_question_id`,
          { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) },
          token
        );
        if (!ok) return json({ status: "error", detail: data }, 400);
        return json(data?.[0] ?? data);
      }

      // POST /api/private/question { plan_id, ord, title, subtitle }
      if (request.method === "POST" && url.pathname === "/api/private/question") {
        const token = getAuthToken(request);
        if (!token) return json({ status: "unauthorized" }, 401);

        const body = await request.json().catch(() => null);
        if (!body?.plan_id) return json({ status: "missing_plan_id" }, 400);
        if (typeof body?.ord !== "number") return json({ status: "missing_ord" }, 400);

        const payload = {
          plan_id: body.plan_id,
          ord: body.ord,
          title: body.title ?? "¿Qué preferís?",
          subtitle: body.subtitle ?? null,
        };

        const { ok, data } = await supabaseRest(
          env,
          `/rest/v1/questions?select=id,plan_id,ord,title,subtitle`,
          {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(payload),
          },
          token
        );

        if (!ok) return json({ status: "error", detail: data }, 400);
        return json(data?.[0] ?? data);
      }

      // ✅ PATCH /api/private/plan/:id/templates
// body: { invite_title_template?: string|null, invite_body_template?: string|null }
if (
  request.method === "PATCH" &&
  url.pathname.startsWith("/api/private/plan/") &&
  url.pathname.endsWith("/templates")
) {
  const token = getAuthToken(request);
  if (!token) return json({ status: "unauthorized" }, 401);

  const parts = url.pathname.split("/");
  const planId = parts[4]; // /api/private/plan/:id/templates
  if (!planId) return json({ status: "missing_plan_id" }, 400);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ status: "bad_json" }, 400);

  const patch: any = {};
  if ("invite_title_template" in body) patch.invite_title_template = body.invite_title_template ?? null;
  if ("invite_body_template" in body) patch.invite_body_template = body.invite_body_template ?? null;

  if (Object.keys(patch).length === 0) {
    return json({ status: "missing_patch_fields" }, 400);
  }

  const { ok, data } = await supabaseRest(
    env,
    `/rest/v1/plans?id=eq.${encodeURIComponent(planId)}&select=id,invite_title_template,invite_body_template`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    },
    token
  );

  if (!ok) return json({ status: "error", detail: data }, 400);
  return json(data?.[0] ?? data);
}


      // ✅ PATCH /api/private/question/:id { title?, subtitle?, ord? }
      if (request.method === "PATCH" && url.pathname.startsWith("/api/private/question/")) {
        const token = getAuthToken(request);
        if (!token) return json({ status: "unauthorized" }, 401);

        const id = url.pathname.split("/").pop() || "";
        if (!id) return json({ status: "missing_id" }, 400);

        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") return json({ status: "bad_json" }, 400);

        // Permitimos solo campos esperados
        const patch: any = {};
        if (typeof body.title === "string") patch.title = body.title;
        if (typeof body.subtitle === "string" || body.subtitle === null) patch.subtitle = body.subtitle;
        if (typeof body.ord === "number") patch.ord = body.ord;

        if (Object.keys(patch).length === 0) {
          return json({ status: "missing_patch_fields" }, 400);
        }

        const { ok, data } = await supabaseRest(
          env,
          `/rest/v1/questions?id=eq.${encodeURIComponent(id)}&select=id,plan_id,ord,title,subtitle`,
          {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(patch),
          },
          token
        );

        if (!ok) return json({ status: "error", detail: data }, 400);
        return json(data?.[0] ?? data);
      }

      // ✅ DELETE /api/private/question/:id
      // Borra primero options (por FK), luego la question
      if (request.method === "DELETE" && url.pathname.startsWith("/api/private/question/")) {
        const token = getAuthToken(request);
        if (!token) return json({ status: "unauthorized" }, 401);

        const id = url.pathname.split("/").pop() || "";
        if (!id) return json({ status: "missing_id" }, 400);

        // 1) borrar options asociadas
        const delOpts = await supabaseRest(
          env,
          `/rest/v1/options?question_id=eq.${encodeURIComponent(id)}`,
          { method: "DELETE" },
          token
        );
        if (!delOpts.ok) return json({ status: "error", detail: delOpts.data, step: "delete_options" }, 400);

        // 2) borrar question
        const delQ = await supabaseRest(
          env,
          `/rest/v1/questions?id=eq.${encodeURIComponent(id)}`,
          { method: "DELETE" },
          token
        );
        if (!delQ.ok) return json({ status: "error", detail: delQ.data, step: "delete_question" }, 400);

        return json({ status: "ok" });
      }

      // POST /api/private/options2 { question_id, a:{label,image_url}, b:{label,image_url} }
      if (request.method === "POST" && url.pathname === "/api/private/options2") {
        const token = getAuthToken(request);
        if (!token) return json({ status: "unauthorized" }, 401);

        const body = await request.json().catch(() => null);
        if (!body?.question_id) return json({ status: "missing_question_id" }, 400);
        if (body?.a?.label == null || body?.b?.label == null) return json({ status: "missing_labels" }, 400);

        const payload = [
          { question_id: body.question_id, ord: 1, label: body.a.label, image_url: body.a.image_url ?? null },
          { question_id: body.question_id, ord: 2, label: body.b.label, image_url: body.b.image_url ?? null },
        ];

        const { ok, data } = await supabaseRest(
          env,
          `/rest/v1/options?select=id,question_id,ord,label,image_url,next_question_id`,
          {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(payload),
          },
          token
        );

        if (!ok) return json({ status: "error", detail: data }, 400);
        return json(data);
      }

      // ✅ PATCH /api/private/option/:id { next_question_id?, label?, image_url? }
      if (request.method === "PATCH" && url.pathname.startsWith("/api/private/option/")) {
        const token = getAuthToken(request);
        if (!token) return json({ status: "unauthorized" }, 401);

        const id = url.pathname.split("/").pop() || "";
        if (!id) return json({ status: "missing_id" }, 400);

        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") return json({ status: "bad_json" }, 400);

        const patch: any = {};
        if ("next_question_id" in body) patch.next_question_id = body.next_question_id ?? null;
        if (typeof body.label === "string") patch.label = body.label;
        if ("image_url" in body) patch.image_url = body.image_url ?? null;

        if (Object.keys(patch).length === 0) {
          return json({ status: "missing_patch_fields" }, 400);
        }

        const { ok, data } = await supabaseRest(
          env,
          `/rest/v1/options?id=eq.${encodeURIComponent(id)}&select=id,question_id,ord,label,image_url,next_question_id`,
          {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(patch),
          },
          token
        );

        if (!ok) return json({ status: "error", detail: data }, 400);
        return json(data?.[0] ?? data);
      }

      // PATCH /api/private/plan/:id/publish { expires_in_hours? }
      if (
        request.method === "PATCH" &&
        url.pathname.startsWith("/api/private/plan/") &&
        url.pathname.endsWith("/publish")
      ) {
        const token = getAuthToken(request);
        if (!token) return json({ status: "unauthorized" }, 401);

        const parts = url.pathname.split("/");
        const planId = parts[4]; // /api/private/plan/:id/publish
        if (!planId) return json({ status: "missing_plan_id" }, 400);

        const body = await request.json().catch(() => ({}));

        // 1) publicar plan
        const upd = await supabaseRest(
          env,
          `/rest/v1/plans?id=eq.${encodeURIComponent(planId)}&select=id,status`,
          { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "published" }) },
          token
        );
        if (!upd.ok) return json({ status: "error", detail: upd.data }, 400);

        // 2) crear invite (retry básico si justo colisiona el code)
        const expiresAt =
          typeof body?.expires_in_hours === "number"
            ? new Date(Date.now() + body.expires_in_hours * 3600_000).toISOString()
            : null;

        for (let attempt = 0; attempt < 5; attempt++) {
          const code = randCode(7);

          const ins = await supabaseRest(
            env,
            `/rest/v1/invites?select=code,expires_at,is_active`,
            {
              method: "POST",
              headers: { Prefer: "return=representation" },
              body: JSON.stringify({ plan_id: planId, code, is_active: true, expires_at: expiresAt }),
            },
            token
          );

          if (ins.ok) {
            return json({
              status: "ok",
              invite: ins.data?.[0] ?? ins.data,
              share_url: `/i/${code}`,
            });
          }

          if (attempt === 4) {
            return json({ status: "error", detail: ins.data }, 400);
          }
        }
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
      const msg = err && (err.stack || err.message) ? String(err.stack || err.message) : String(err);
      return html(`<h1>Worker exception</h1><pre style="white-space:pre-wrap">${escapeHtml(msg)}</pre>`, 500);
    }
  },
};
