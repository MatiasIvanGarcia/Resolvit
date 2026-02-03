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

      // ✅ PATCH /api/private/plan/:id/templates { invite_title_template?, invite_body_template? }
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

  if (Object.keys(patch).length === 0) return json({ status: "missing_patch_fields" }, 400);

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

      // GET /api/private/plan/:id/builder  -> plan + questions + options
if (request.method === "GET" && url.pathname.startsWith("/api/private/plan/") && url.pathname.endsWith("/builder")) {
  const token = getAuthToken(request);
  if (!token) return json({ status: "unauthorized" }, 401);

  const parts = url.pathname.split("/");
  const planId = parts[4]; // /api/private/plan/:id/builder
  if (!planId) return json({ status: "missing_plan_id" }, 400);

  // 1) plan
  const p = await supabaseRest(
    env,
    `/rest/v1/plans?id=eq.${encodeURIComponent(planId)}&select=id,title,person_name,status,background_image_url,invite_title_template,invite_body_template`,
    { method: "GET" },
    token
  );
  if (!p.ok) return json({ status: "error", detail: p.data }, 400);
  const plan = p.data?.[0];
  if (!plan) return json({ status: "not_found" }, 404);

  // 2) questions
  const qs = await supabaseRest(
    env,
    `/rest/v1/questions?plan_id=eq.${encodeURIComponent(planId)}&select=id,plan_id,ord,title,subtitle&order=ord.asc`,
    { method: "GET" },
    token
  );
  if (!qs.ok) return json({ status: "error", detail: qs.data }, 400);

  const questions = qs.data ?? [];
  const qids = questions.map((q: any) => q.id);

  // 3) options (si no hay preguntas, devolvemos [])
  let options: any[] = [];
  if (qids.length > 0) {
    const inList = qids.map((x: string) => `"${x}"`).join(",");
    const os = await supabaseRest(
      env,
      `/rest/v1/options?question_id=in.(${inList})&select=id,question_id,ord,label,image_url,next_question_id&order=question_id.asc,ord.asc`,
      { method: "GET" },
      token
    );
    if (!os.ok) return json({ status: "error", detail: os.data }, 400);
    options = os.data ?? [];
  }

  return json({ status: "ok", plan, questions, options });
}


// GET /api/private/plan/:id/full  -> plan + questions + options + invite activo (si existe)
if (request.method === "GET" && url.pathname.startsWith("/api/private/plan/") && url.pathname.endsWith("/full")) {
  const token = getAuthToken(request);
  if (!token) return json({ status: "unauthorized" }, 401);

  const parts = url.pathname.split("/");
  const planId = parts[4]; // /api/private/plan/:id/full
  if (!planId) return json({ status: "missing_plan_id" }, 400);

  // 1) plan
  const pRes = await supabaseRest(
    env,
    `/rest/v1/plans?id=eq.${encodeURIComponent(planId)}&select=id,title,person_name,status,start_question_id,background_image_url,message_title_template,message_body_template`,
    { method: "GET" },
    token
  );
  if (!pRes.ok) return json({ status: "error", step: "get_plan", detail: pRes.data }, 400);

  const plan = (pRes.data?.[0] ?? null);
  if (!plan) return json({ status: "not_found" }, 404);

  // 2) questions
  const qRes = await supabaseRest(
    env,
    `/rest/v1/questions?plan_id=eq.${encodeURIComponent(planId)}&select=id,plan_id,ord,title,subtitle&order=ord.asc`,
    { method: "GET" },
    token
  );
  if (!qRes.ok) return json({ status: "error", step: "get_questions", detail: qRes.data }, 400);

  const questions = qRes.data ?? [];
  const qids: string[] = questions.map((q: any) => q.id);

  // 3) options (para todas las questions del plan)
  let options: any[] = [];
  if (qids.length > 0) {
    const inList = qids.map((x) => `"${x}"`).join(",");
    const oRes = await supabaseRest(
      env,
      `/rest/v1/options?question_id=in.(${inList})&select=id,question_id,ord,label,image_url,next_question_id&order=question_id.asc,ord.asc`,
      { method: "GET" },
      token
    );
    if (!oRes.ok) return json({ status: "error", step: "get_options", detail: oRes.data }, 400);
    options = oRes.data ?? [];
  }

  // 4) invite activo (si querés mostrar link)
  const iRes = await supabaseRest(
    env,
    `/rest/v1/invites?plan_id=eq.${encodeURIComponent(planId)}&is_active=eq.true&select=code,expires_at,is_active&order=created_at.desc&limit=1`,
    { method: "GET" },
    token
  );
  // ojo: si no tenés created_at, sacá order=created_at.desc
  const invite = iRes.ok ? (iRes.data?.[0] ?? null) : null;

  return json({
    status: "ok",
    plan,
    questions,
    options,
    invite,
    share_url: invite?.code ? `/i/${invite.code}` : null,
  });
}

// PATCH /api/private/plan/:id  -> editar meta del plan (title/person/background/templates)
if (request.method === "PATCH" && url.pathname.startsWith("/api/private/plan/") && !url.pathname.endsWith("/publish") && !url.pathname.endsWith("/full")) {
  const token = getAuthToken(request);
  if (!token) return json({ status: "unauthorized" }, 401);

  const parts = url.pathname.split("/");
  const planId = parts[4]; // /api/private/plan/:id
  if (!planId) return json({ status: "missing_plan_id" }, 400);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ status: "bad_json" }, 400);

  const patch: any = {};

  if (typeof body.title === "string") patch.title = body.title;
  if ("person_name" in body) patch.person_name = body.person_name ?? null;
  if ("background_image_url" in body) patch.background_image_url = body.background_image_url ?? null;

  if ("message_title_template" in body) patch.message_title_template = body.message_title_template ?? null;
  if ("message_body_template" in body) patch.message_body_template = body.message_body_template ?? null;

  if (Object.keys(patch).length === 0) return json({ status: "missing_patch_fields" }, 400);

  const upd = await supabaseRest(
    env,
    `/rest/v1/plans?id=eq.${encodeURIComponent(planId)}&select=id,title,person_name,status,start_question_id,background_image_url,message_title_template,message_body_template`,
    { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) },
    token
  );
  if (!upd.ok) return json({ status: "error", detail: upd.data }, 400);

  return json(upd.data?.[0] ?? upd.data);
}

      
      // GET /api/private/plans  -> lista planes del usuario + ultimo invite (si hay)
if (request.method === "GET" && url.pathname === "/api/private/plans") {
  const token = getAuthToken(request);
  if (!token) return json({ status: "unauthorized" }, 401);

  // 1) Traigo planes del user (RLS se encarga)
  const plansRes = await supabaseRest(
    env,
    `/rest/v1/plans?select=id,title,person_name,status,background_image_url,created_at&order=created_at.desc`,
    { method: "GET" },
    token
  );
  if (!plansRes.ok) return json({ status: "error", detail: plansRes.data }, 400);

  const plans = (plansRes.data || []) as Array<any>;
  if (plans.length === 0) return json({ status: "ok", plans: [] });

  // 2) Traigo invites para esos planes (1 query) y elijo el más reciente activo por plan
  const ids = plans.map((p) => p.id);
  const invitesRes = await supabaseRest(
    env,
    `/rest/v1/invites?select=plan_id,code,expires_at,is_active,created_at&plan_id=in.(${ids
      .map((x) => `"${x}"`)
      .join(",")})&order=created_at.desc`,
    { method: "GET" },
    token
  );
  if (!invitesRes.ok) return json({ status: "error", detail: invitesRes.data }, 400);

  const invites = (invitesRes.data || []) as Array<any>;
  const latestByPlan: Record<string, any> = {};

  for (const inv of invites) {
    if (!inv.is_active) continue;
    if (!latestByPlan[inv.plan_id]) latestByPlan[inv.plan_id] = inv; // viene ordenado desc
  }

  const out = plans.map((p) => {
    const inv = latestByPlan[p.id] || null;
    return {
      ...p,
      invite: inv
        ? {
            code: inv.code,
            expires_at: inv.expires_at,
            share_url: `/i/${inv.code}`,
          }
        : null,
    };
  });

  return json({ status: "ok", plans: out });
}

// PATCH /api/private/plan/:id/message_template
if (
  request.method === "PATCH" &&
  url.pathname.startsWith("/api/private/plan/") &&
  url.pathname.endsWith("/message_template")
) {
  const token = getAuthToken(request);
  if (!token) return json({ status: "unauthorized" }, 401);

  const parts = url.pathname.split("/");
  const planId = parts[4];
  if (!planId) return json({ status: "missing_plan_id" }, 400);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ status: "bad_json" }, 400);

  const patch: any = {};
  if (typeof body.message_title_template === "string") patch.message_title_template = body.message_title_template;
  if (typeof body.message_body_template === "string") patch.message_body_template = body.message_body_template;

  if (Object.keys(patch).length === 0) return json({ status: "missing_patch_fields" }, 400);

  const { ok, data } = await supabaseRest(
    env,
    `/rest/v1/plans?id=eq.${encodeURIComponent(planId)}&select=id,message_title_template,message_body_template`,
    { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) },
    token
  );

  if (!ok) return json({ status: "error", detail: data }, 400);
  return json(data?.[0] ?? data);
}

// DELETE /api/private/plan/:id  -> borra plan + todo lo relacionado (options, questions, invites, submissions)
if (request.method === "DELETE" && url.pathname.startsWith("/api/private/plan/")) {
  const token = getAuthToken(request);
  if (!token) return json({ status: "unauthorized" }, 401);

  const parts = url.pathname.split("/");
  const planId = parts[4]; // /api/private/plan/:id
  if (!planId) return json({ status: "missing_plan_id" }, 400);

  // 0) traer questions del plan (para borrar options)
  const qRes = await supabaseRest(
    env,
    `/rest/v1/questions?plan_id=eq.${encodeURIComponent(planId)}&select=id`,
    { method: "GET" },
    token
  );
  if (!qRes.ok) return json({ status: "error", step: "get_questions", detail: qRes.data }, 400);

  const qids = (qRes.data || []).map((x: any) => x.id) as string[];

  // 1) borrar options de esas questions
  if (qids.length > 0) {
    const inList = qids.map((x) => `"${x}"`).join(",");
    const delOpts = await supabaseRest(
      env,
      `/rest/v1/options?question_id=in.(${inList})`,
      { method: "DELETE" },
      token
    );
    if (!delOpts.ok) return json({ status: "error", step: "delete_options", detail: delOpts.data }, 400);
  }

  // 2) borrar questions del plan
  const delQs = await supabaseRest(
    env,
    `/rest/v1/questions?plan_id=eq.${encodeURIComponent(planId)}`,
    { method: "DELETE" },
    token
  );
  if (!delQs.ok) return json({ status: "error", step: "delete_questions", detail: delQs.data }, 400);

  // 3) borrar invites del plan
  const delInv = await supabaseRest(
    env,
    `/rest/v1/invites?plan_id=eq.${encodeURIComponent(planId)}`,
    { method: "DELETE" },
    token
  );
  if (!delInv.ok) return json({ status: "error", step: "delete_invites", detail: delInv.data }, 400);

  // 4) borrar submissions del plan (si las guardás)
  const delSub = await supabaseRest(
    env,
    `/rest/v1/submissions?plan_id=eq.${encodeURIComponent(planId)}`,
    { method: "DELETE" },
    token
  );
  // si no existe tabla submissions o no la usás, podés borrar este bloque
  if (!delSub.ok) return json({ status: "error", step: "delete_submissions", detail: delSub.data }, 400);

  // 5) borrar plan
  const delPlan = await supabaseRest(
    env,
    `/rest/v1/plans?id=eq.${encodeURIComponent(planId)}`,
    { method: "DELETE" },
    token
  );
  if (!delPlan.ok) return json({ status: "error", step: "delete_plan", detail: delPlan.data }, 400);

  return json({ status: "ok" });
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
// ✅ PATCH /api/private/plan/:id { title?, person_name?, background_image_url? }
if (request.method === "PATCH" && url.pathname.startsWith("/api/private/plan/") && !url.pathname.endsWith("/publish")) {
  const token = getAuthToken(request);
  if (!token) return json({ status: "unauthorized" }, 401);

  const id = url.pathname.split("/").pop() || "";
  if (!id) return json({ status: "missing_id" }, 400);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ status: "bad_json" }, 400);

  const patch: any = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.person_name === "string" || body.person_name === null) patch.person_name = body.person_name;
  if (typeof body.background_image_url === "string" || body.background_image_url === null)
    patch.background_image_url = body.background_image_url;

  if (Object.keys(patch).length === 0) return json({ status: "missing_patch_fields" }, 400);

  const { ok, data } = await supabaseRest(
    env,
    `/rest/v1/plans?id=eq.${encodeURIComponent(id)}&select=id,title,person_name,status,start_question_id,background_image_url`,
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
