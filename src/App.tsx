import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sentinel para “vacío” en DB (evita missing_labels) pero UI lo muestra vacío
const EMPTY = "__";

type PublicPlan =
  | { status: "expired" | "unpublished" | "not_found" | "invalid_code" | string; [k: string]: any }
  | {
      status: "ok";
      invite: { code: string; expires_at: string | null };
      plan: {
        id: string;
        title: string;
        person_name: string | null;
        start_question_id: string | null;
      };
      questions: Array<{
        id: string;
        ord: number;
        title: string;
        subtitle: string | null;
        options: Array<{
          id: string;
          ord: number;
          label: string;
          image_url: string | null;
          next_question_id: string | null;
        }>;
      }>;
    };

function usePath() {
  const [path, setPath] = React.useState(window.location.pathname);
  React.useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

function navigate(to: string) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function useSession() {
  const [session, setSession] = React.useState<Session | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return session;
}

function Home({ session }: { session: Session | null }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="text-lg font-semibold">Plan Invitación</div>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <button
                className="rounded-2xl bg-white text-slate-950 px-4 py-2 text-sm hover:opacity-90"
                onClick={() => navigate("/create")}
              >
                Crear plan
              </button>
              <button
  className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
  onClick={() => navigate("/plans")}
>
  Mis planes
</button>

              <button
                className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/");
                }}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <button
              className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
              onClick={() => navigate("/login")}
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="max-w-2xl space-y-5">
          <h1 className="text-4xl md:text-6xl font-semibold leading-tight">
            Creá invitaciones interactivas para armar planes.
          </h1>
          <p className="text-white/70 text-lg">
            Armás preguntas con dos opciones (con fotos).
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className="rounded-2xl bg-white text-slate-950 px-5 py-3 text-sm font-semibold hover:opacity-90"
              onClick={() => navigate(session ? "/create" : "/login")}
            >
              Empezar
            </button>
            <button
              className="rounded-2xl bg-white/10 border border-white/15 px-5 py-3 text-sm hover:bg-white/15"
              onClick={() => navigate("/invite/ABC123")}
            >
              Ver demo
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Login() {
  const [mode, setMode] = React.useState<"login" | "signup">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function submit() {
    setMsg(null);

    if (mode === "signup") {
      if (password.length < 6) {
        setMsg("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (password !== confirm) {
        setMsg("Las contraseñas no coinciden.");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg(error.message);
        else navigate("/create");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setMsg(error.message);
        else navigate("/create");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <button className="text-lg font-semibold" onClick={() => navigate("/")}>
          Plan Invitación
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>

          <div className="space-y-2">
            <input
              className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {mode === "signup" && (
              <input
                className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                placeholder="Confirmar contraseña"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                autoComplete="new-password"
              />
            )}
          </div>

          {msg && <div className="text-red-300 text-sm">{msg}</div>}

          <button
            disabled={busy || !email || !password || (mode === "signup" && !confirm)}
            onClick={submit}
            className="w-full rounded-2xl bg-white text-slate-950 px-4 py-3 font-semibold disabled:opacity-50"
          >
            {busy ? "..." : mode === "login" ? "Entrar" : "Registrarme"}
          </button>

          <button
            className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3"
            onClick={() => {
              setMsg(null);
              setMode(mode === "login" ? "signup" : "login");
            }}
          >
            {mode === "login" ? "No tengo cuenta" : "Ya tengo cuenta"}
          </button>

          <button className="w-full text-white/70 text-sm underline" onClick={() => navigate("/")}>
            Volver
          </button>
        </div>
      </main>
    </div>
  );
}

function getQueryParam(name: string) {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  } catch {
    return null;
  }
}

function CreateLinear({ session }: { session: Session }) {
  type PlanRow = {
    id: string;
    title: string;
    person_name: string | null;
    status: string;
    background_image_url?: string | null;
    invite_title_template?: string | null;
    invite_body_template?: string | null;
  };

  type QuestionRow = {
    id: string;
    plan_id: string;
    ord: number;
    title: string;
    subtitle: string | null;
  };

  type OptionRow = {
    id: string;
    question_id: string;
    ord: number;
    label: string;
    image_url: string | null;
    next_question_id: string | null;
  };

  async function authedFetch(path: string, init?: RequestInit) {
    const token = session.access_token;
    const res = await fetch(path, {
      ...(init || {}),
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data ? JSON.stringify(data) : "Request failed");
    return data;
  }

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [plan, setPlan] = React.useState<PlanRow | null>(null);

  // SOLO se usan cuando todavía NO hay plan (pantalla de "Crear plan")
  const [title, setTitle] = React.useState("");
  const [personName, setPersonName] = React.useState("");

  // Fondo editable del plan (URL)
  const [bgUrl, setBgUrl] = React.useState("");

  // Modo edición por query param (?plan=...)
  const editingPlanId = React.useMemo(() => getQueryParam("plan"), []);
  const isEditing = Boolean(editingPlanId);

  const [questions, setQuestions] = React.useState<QuestionRow[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = React.useState<Record<string, OptionRow[]>>({});
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);

  // Editor de template del mensaje final
  const DEFAULT_TITLE_TMPL = "Te invito #persona a que pasemos #plan juntos";
  const DEFAULT_BODY_TMPL = "Hola #persona!!\n\n¿Te copás a #decision1?\n\nTe espero!!";

  const [inviteTitleTmpl, setInviteTitleTmpl] = React.useState(DEFAULT_TITLE_TMPL);
  const [inviteBodyTmpl, setInviteBodyTmpl] = React.useState(DEFAULT_BODY_TMPL);
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);

  const titleRef = React.useRef<HTMLInputElement | null>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null);

  const sortedQuestions = React.useMemo(
    () => questions.slice().sort((a, b) => a.ord - b.ord),
    [questions]
  );

  function getOpts(qid: string) {
    return (optionsByQuestion[qid] || []).slice().sort((a, b) => a.ord - b.ord);
  }

  function isComplete(q: QuestionRow) {
    const opts = getOpts(q.id);
    return Boolean(q.subtitle?.trim()) && opts.length === 2 && opts.every((o) => (o.label || "").trim().length > 0);
  }

  const canPublish = Boolean(plan?.id) && sortedQuestions.length > 0 && sortedQuestions.every(isComplete);

  function variablesList() {
    const vars = ["#plan", "#persona"];
    sortedQuestions.forEach((_, i) => vars.push(`#decision${i + 1}`));
    return vars;
  }

  async function loadPlanForEdit(planId: string) {
  setBusy(true);
  setError(null);
  try {
    const data = await authedFetch(`/api/private/plan/${encodeURIComponent(planId)}/full`, { method: "GET" });

    if (data?.status !== "ok") throw new Error(JSON.stringify(data));

    const p = data.plan as PlanRow & {
      background_image_url?: string | null;
      invite_title_template?: string | null;
      invite_body_template?: string | null;
    };

    setPlan({ id: p.id, title: p.title, person_name: p.person_name ?? null, status: p.status });

    setTitle(p.title ?? "");
    setPersonName(p.person_name ?? "");
    setBgUrl(p.background_image_url ?? "");


    const qs: QuestionRow[] = (data.questions ?? []);
    const opts: OptionRow[] = (data.options ?? []);

    setQuestions(qs);

    const grouped: Record<string, OptionRow[]> = {};
    for (const o of opts) {
      (grouped[o.question_id] ||= []).push(o);
    }
    setOptionsByQuestion(grouped);

    // si querés mostrar shareUrl en editor:
    setShareUrl(data.share_url ?? null);
  } catch (e: any) {
    setError(String(e.message || e));
  } finally {
    setBusy(false);
  }
}

  function insertAtCursor(target: "title" | "body", token: string) {
    if (target === "title") {
      const el = titleRef.current;
      if (!el) return;
      const start = el.selectionStart ?? inviteTitleTmpl.length;
      const end = el.selectionEnd ?? inviteTitleTmpl.length;
      const next = inviteTitleTmpl.slice(0, start) + token + inviteTitleTmpl.slice(end);
      setInviteTitleTmpl(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      const el = bodyRef.current;
      if (!el) return;
      const start = el.selectionStart ?? inviteBodyTmpl.length;
      const end = el.selectionEnd ?? inviteBodyTmpl.length;
      const next = inviteBodyTmpl.slice(0, start) + token + inviteBodyTmpl.slice(end);
      setInviteBodyTmpl(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
    }
  }

  async function patchPlan(patch: Partial<PlanRow>) {
  if (!plan?.id) return;
  setError(null);
  try {
    const updated = await authedFetch(`/api/private/plan/${encodeURIComponent(plan.id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setPlan((prev) => (prev ? { ...prev, ...updated } : updated));
  } catch (e: any) {
    setError(String(e.message || e));
  }
}
React.useEffect(() => {
  if (!isEditing || !editingPlanId) return;

  (async () => {
    try {
      setBusy(true);
      setError(null);

      const data = await authedFetch(`/api/private/plan/${encodeURIComponent(editingPlanId)}/builder`, {
        method: "GET",
      });

      if (data.status !== "ok") throw new Error(JSON.stringify(data));

      const p = data.plan as PlanRow;
      const qs = (data.questions || []) as QuestionRow[];
      const os = (data.options || []) as OptionRow[];

      setPlan(p);
      setBgUrl(p.background_image_url ?? "");

      // templates
      setInviteTitleTmpl(p.invite_title_template ?? DEFAULT_TITLE_TMPL);
      setInviteBodyTmpl(p.invite_body_template ?? DEFAULT_BODY_TMPL);

      // questions + optionsByQuestion
      setQuestions(qs);

      const map: Record<string, OptionRow[]> = {};
      for (const o of os) {
        (map[o.question_id] ||= []).push(o);
      }
      setOptionsByQuestion(map);

      // shareUrl la podés dejar null en edición (o buscar invite activo después)
      setShareUrl(null);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  })();
}, [isEditing, editingPlanId]);

  React.useEffect(() => {
  if (editingPlanId) {
    loadPlanForEdit(editingPlanId);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [editingPlanId]);

async function patchPlan(patch: any) {
  if (!plan?.id) return;
  setError(null);
  try {
    const updated = await authedFetch(`/api/private/plan/${encodeURIComponent(plan.id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });

    // si tu backend devuelve representation del plan, esto sincroniza el estado
    setPlan((prev) => (prev ? { ...prev, ...updated } : prev));

    // sincronizo también campos locales por si querés
    if (typeof updated?.title === "string") setTitle(updated.title);
    if ("person_name" in (updated || {})) setPersonName(updated.person_name ?? "");
    if ("" in (updated || {})) setBgUrl(updated.background_image_url ?? "");
  } catch (e: any) {
    setError(String(e.message || e));
  }
}



  async function saveTemplates() {
    if (!plan?.id) return;
    setBusy(true);
    setError(null);
    setSaveMsg(null);
    try {
      const data = await authedFetch(`/api/private/plan/${encodeURIComponent(plan.id)}/templates`, {
        method: "PATCH",
        body: JSON.stringify({
          invite_title_template: inviteTitleTmpl,
          invite_body_template: inviteBodyTmpl,
        }),
      });
      setPlan((p) => (p ? { ...p, ...data } : p));
      setSaveMsg("Guardado ✅");
      window.setTimeout(() => setSaveMsg(null), 1500);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function createPlan() {
    setError(null);
    setBusy(true);
    try {
      const data = await authedFetch("/api/private/plan", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), person_name: personName.trim() || null }),
      });
      setPlan(data);
      setBgUrl(data.background_image_url ?? "");
      setQuestions([]);
      setOptionsByQuestion({});
      setShareUrl(null);

      // set defaults templates
      setInviteTitleTmpl(DEFAULT_TITLE_TMPL);
      setInviteBodyTmpl(DEFAULT_BODY_TMPL);

      // guardar defaults en backend
      await authedFetch(`/api/private/plan/${encodeURIComponent(data.id)}/templates`, {
        method: "PATCH",
        body: JSON.stringify({
          invite_title_template: DEFAULT_TITLE_TMPL,
          invite_body_template: DEFAULT_BODY_TMPL,
        }),
      });
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function addDecision() {
    if (!plan?.id) return;
    setBusy(true);
    setError(null);
    try {
      const nextOrd = (questions.reduce((m, q) => Math.max(m, q.ord), 0) || 0) + 1;

      const q: QuestionRow = await authedFetch("/api/private/question", {
        method: "POST",
        body: JSON.stringify({
          plan_id: plan.id,
          ord: nextOrd,
          title: "¿Qué preferís?",
          subtitle: "",
        }),
      });

      // 👇 labels vacíos (no texto “Opción 1/2”), el placeholder lo muestra el input
      const opts: OptionRow[] = await authedFetch("/api/private/options2", {
        method: "POST",
        body: JSON.stringify({
          question_id: q.id,
          a: { label: "", image_url: null },
          b: { label: "", image_url: null },
        }),
      });

      setQuestions((prev) => [...prev, q]);
      setOptionsByQuestion((prev) => ({ ...prev, [q.id]: opts }));
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function patchQuestion(qid: string, patch: Partial<QuestionRow>) {
    setError(null);
    try {
      const updated = await authedFetch(`/api/private/question/${encodeURIComponent(qid)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setQuestions((prev) => prev.map((q) => (q.id === qid ? { ...q, ...updated } : q)));
    } catch (e: any) {
      setError(String(e.message || e));
    }
  }

  async function deleteDecision(qid: string) {
    if (!confirm("¿Eliminar esta decisión?")) return;
    setBusy(true);
    setError(null);
    try {
      await authedFetch(`/api/private/question/${encodeURIComponent(qid)}`, { method: "DELETE" });

      setQuestions((prev) => prev.filter((q) => q.id !== qid));
      setOptionsByQuestion((prev) => {
        const copy = { ...prev };
        delete copy[qid];
        return copy;
      });
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function patchOption(qid: string, oid: string, patch: Partial<OptionRow>) {
    setError(null);
    try {
      const updated = await authedFetch(`/api/private/option/${encodeURIComponent(oid)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setOptionsByQuestion((prev) => {
        const list = prev[qid] || [];
        return { ...prev, [qid]: list.map((o) => (o.id === oid ? { ...o, ...updated } : o)) };
      });
    } catch (e: any) {
      setError(String(e.message || e));
    }
  }

  async function publish(expiresHours: number | null) {
    if (!plan?.id) return;
    setBusy(true);
    setError(null);
    try {
      // aseguro guardar templates antes de publicar
      await saveTemplates();

      const data = await authedFetch(`/api/private/plan/${encodeURIComponent(plan.id)}/publish`, {
        method: "PATCH",
        body: JSON.stringify({ expires_in_hours: expiresHours }),
      });
      setShareUrl(data.share_url || null);
      setPlan((p) => (p ? { ...p, status: "published" } : p));
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }
async function saveMessageTemplate() {
  if (!plan?.id) return;

  setSavingTemplate(true);
  setError(null);

  try {
    const out = await authedFetch(`/api/private/plan/${encodeURIComponent(plan.id)}/templates`, {
      method: "PATCH",
      body: JSON.stringify({
        invite_title_template: inviteTitleTmpl,
        invite_body_template: inviteBodyTmpl,
      }),
    });

    if (out?.plan) {
      setPlan((p) => (p ? { ...p, ...out.plan } : p));
    } else {
      setPlan((p) =>
        p
          ? { ...p, invite_title_template: inviteTitleTmpl, invite_body_template: inviteBodyTmpl }
          : p
      );
    }

    setSaveMsg("Guardado ✅");
    window.setTimeout(() => setSaveMsg(null), 1200);
  } catch (e: any) {
    setError(String(e.message || e));
  } finally {
    setSavingTemplate(false);
  }
}

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <button className="text-lg font-semibold" onClick={() => navigate("/")}>
          Plan Invitación
        </button>
        <button
          className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/");
          }}
        >
          Cerrar sesión
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* PLAN META */}
        <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
          <div className="text-sm font-semibold">Plan</div>

          {!plan ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none md:col-span-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título (Ej: San Valentín)"
              />
              <input
                className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Persona (opcional)"
              />
              <button
                disabled={busy || !title.trim()}
                className="md:col-span-3 rounded-2xl bg-white text-slate-950 px-4 py-3 font-semibold disabled:opacity-50"
                onClick={createPlan}
              >
                {busy ? "Creando…" : "Crear plan"}
              </button>
            </div>
) : (
  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
    <div className="md:col-span-1">
      <div className="text-xs text-white/60 mb-1">Título</div>
      <input
        className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
        value={plan.title}
        onChange={(e) => setPlan((p) => (p ? { ...p, title: e.target.value } : p))}
        onBlur={() => patchPlan({ title: plan.title.trim() })}
        placeholder="San Valentín"
      />
    </div>

    <div className="md:col-span-1">
      <div className="text-xs text-white/60 mb-1">Para</div>
      <input
        className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
        value={plan.person_name ?? ""}
        onChange={(e) => setPlan((p) => (p ? { ...p, person_name: e.target.value } : p))}
        onBlur={() => patchPlan({ person_name: (plan.person_name ?? "").trim() || null })}
        placeholder="Sofía"
      />
    </div>

    <div className="md:col-span-1">
      <div className="text-xs text-white/60 mb-1">URL Imagen de fondo (opcional)</div>
      <input
        className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
        value={bgUrl}
        onChange={(e) => setBgUrl(e.target.value)}
        onBlur={() => patchPlan({ background_image_url: bgUrl.trim() || null })}
        placeholder="https://..."
      />
    </div>

    <div className="md:col-span-3 text-xs text-white/60">
      estado: <span className="text-white/80">{plan.status}</span>
    </div>
  </div>
)}

        </div>

        {/* LISTA LINEAL */}
        {plan && (
          <div className="mt-6 space-y-4">
            {sortedQuestions.map((q, idx) => {
              const [o1, o2] = getOpts(q.id);
              const complete = isComplete(q);

              return (
                <div key={q.id} className="rounded-3xl border border-white/15 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">#{idx + 1} decisión</div>

                    <div className="flex items-center gap-2">
                      <div
                        className={
                          "text-xs px-2 py-1 rounded-full border " +
                          (complete
                            ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10"
                            : "border-yellow-400/30 text-yellow-200 bg-yellow-500/10")
                        }
                      >
                        {complete ? "Completa" : "Incompleta"}
                      </div>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deleteDecision(q.id)}
                        title="Eliminar"
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-white/60 mb-1">Pregunta</div>
                    <input
                      className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                      value={q.subtitle ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, subtitle: v } : x)));
                      }}
                      onBlur={() => patchQuestion(q.id, { subtitle: q.subtitle ?? "" } as any)}
                      placeholder="Ej: ¿Qué horario te gustaría?"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Opción 1 */}
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs text-white/60 mb-2">Opción izquierda</div>
                      <input
                        className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                        value={o1?.label ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOptionsByQuestion((prev) => ({
                            ...prev,
                            [q.id]: (prev[q.id] || []).map((o) => (o.id === o1?.id ? { ...o, label: v } : o)),
                          }));
                        }}
                        onBlur={() => o1 && patchOption(q.id, o1.id, { label: o1.label ?? "" } as any)}
                        placeholder="Escribí la opción izquierda..."
                      />
                      <input
                        className="mt-2 w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                        value={o1?.image_url ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOptionsByQuestion((prev) => ({
                            ...prev,
                            [q.id]: (prev[q.id] || []).map((o) => (o.id === o1?.id ? { ...o, image_url: v || null } : o)),
                          }));
                        }}
                        onBlur={() => o1 && patchOption(q.id, o1.id, { image_url: o1.image_url ?? null } as any)}
                        placeholder="URL imagen (opcional)"
                      />
                    </div>

                    {/* Opción 2 */}
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs text-white/60 mb-2">Opción derecha</div>
                      <input
                        className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                        value={o2?.label ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOptionsByQuestion((prev) => ({
                            ...prev,
                            [q.id]: (prev[q.id] || []).map((o) => (o.id === o2?.id ? { ...o, label: v } : o)),
                          }));
                        }}
                        onBlur={() => o2 && patchOption(q.id, o2.id, { label: o2.label ?? "" } as any)}
                        placeholder="Escribí la opción derecha..."
                      />
                      <input
                        className="mt-2 w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                        value={o2?.image_url ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOptionsByQuestion((prev) => ({
                            ...prev,
                            [q.id]: (prev[q.id] || []).map((o) => (o.id === o2?.id ? { ...o, image_url: v || null } : o)),
                          }));
                        }}
                        onBlur={() => o2 && patchOption(q.id, o2.id, { image_url: o2.image_url ?? null } as any)}
                        placeholder="URL imagen (opcional)"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              disabled={busy}
              className="w-full rounded-3xl bg-white/10 border border-white/15 px-5 py-4 text-sm hover:bg-white/15 disabled:opacity-50"
              onClick={addDecision}
            >
              + Agregar decisión
            </button>


            {/* MENSAJE FINAL */}
<div className="rounded-3xl border border-white/15 bg-white/5 p-5">
  <div className="text-sm font-semibold">Mensaje final</div>

  <div className="mt-3 text-xs text-white/60">
    Variables disponibles:
    <span className="ml-2">#persona</span>
    <span className="ml-2">#plan</span>
    {sortedQuestions.map((_, i) => (
      <span key={i} className="ml-2">#decision{i + 1}</span>
    ))}
  </div>

  <div className="mt-3">
    <div className="text-xs text-white/60 mb-1">Título</div>
    <input
      className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
      value={inviteTitleTmpl}
onChange={(e) => setInviteTitleTmpl(e.target.value)}
    />
  </div>

  <div className="mt-3">
    <div className="text-xs text-white/60 mb-1">Cuerpo</div>
    <textarea
      rows={8}
      className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none resize-none"
      value={inviteBodyTmpl}
onChange={(e) => setInviteBodyTmpl(e.target.value)}
    />
  </div>

  <button
    disabled={savingTemplate}
    onClick={saveMessageTemplate}
    className="mt-4 rounded-2xl bg-white text-slate-950 px-4 py-2 text-sm font-semibold disabled:opacity-50"
  >
    {savingTemplate ? "Guardando…" : "Guardar mensaje"}
  </button>
</div>


            {/* PUBLICAR */}
            <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
              <div className="text-sm font-semibold">Publicar</div>
              <div className="mt-2 text-sm text-white/70">
                {canPublish ? "Listo para publicar ✅" : "Completá todas las preguntas y las 2 opciones en cada decisión."}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  disabled={busy || !canPublish}
                  className="rounded-2xl bg-white text-slate-950 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  onClick={() => publish(null)}
                >
                  Publicar
                </button>
              </div>

              {shareUrl && (
                <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-3">
                  <div className="text-xs text-white/60">Link</div>
                  <div className="mt-1 font-mono text-sm break-all">
                    {window.location.origin}
                    {shareUrl}
                  </div>
                  <button
                    className="mt-3 rounded-2xl bg-white text-slate-950 px-4 py-2 text-sm font-semibold"
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
                      alert("Copiado ✅");
                    }}
                  >
                    Copiar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MyPlans({ session }: { session: Session }) {
  type PlanItem = {
    id: string;
    title: string;
    person_name: string | null;
    status: string;
    background_image_url: string | null;
    invite: null | { code: string; expires_at: string | null; share_url: string };
  };

  async function authedFetch(path: string, init?: RequestInit) {
    const token = session.access_token;
    const res = await fetch(path, {
      ...(init || {}),
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data ? JSON.stringify(data) : "Request failed");
    return data;
  }

  const [plans, setPlans] = React.useState<PlanItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await authedFetch("/api/private/plans", { method: "GET" });
        if (!cancelled) setPlans(data?.plans || []);
      } catch (e: any) {
        if (!cancelled) setError(String(e.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <button className="text-lg font-semibold" onClick={() => navigate("/")}>
          Plan Invitación
        </button>

        <div className="flex items-center gap-2">
          <button
            className="rounded-2xl bg-white text-slate-950 px-4 py-2 text-sm font-semibold hover:opacity-90"
            onClick={() => navigate("/create")}
          >
            Crear plan
          </button>
          <button
            className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/");
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold">Mis planes</div>
            <div className="text-white/60 text-sm">Tus planes guardados en mosaico</div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-10 text-white/70">Cargando…</div>
        ) : plans.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-white/15 bg-white/5 p-6 text-white/70">
            Todavía no tenés planes. Creá uno desde “Crear plan”.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((p) => {
              const share =
                p.invite?.share_url ? `${window.location.origin}${p.invite.share_url}` : null;

              return (
                <div
                  key={p.id}
                  className="group relative h-[200px] rounded-3xl overflow-hidden border border-white/15 bg-white/5 shadow-2xl"
                >
                  {/* Fondo */}
                  {p.background_image_url ? (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${p.background_image_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-white/10" />
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

                  {/* Contenido */}
                  <div className="relative h-full w-full p-5 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="text-xs px-2 py-1 rounded-full border border-white/15 bg-black/30 text-white/70">
                        {p.status}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-semibold leading-tight">
                        {p.title || "Sin título"}
                      </div>
                      <div className="text-white/70 text-sm mt-1">
                        {p.person_name ? `para ${p.person_name}` : "sin destinatario"}
                      </div>
                    </div>

{/* Hover actions */}
<div className="opacity-0 group-hover:opacity-100 transition-opacity space-y-2">
  <div className="flex gap-2">
    <button
      className="flex-1 rounded-2xl bg-white text-slate-950 px-3 py-2 text-xs font-semibold hover:opacity-90"
      onClick={() => navigate(`/create?plan=${encodeURIComponent(p.id)}`)}
    >
      Editar
    </button>

    <button
      className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20"
      onClick={async () => {
        if (!confirm("¿Eliminar este plan y todo lo relacionado?")) return;

        try {
          await authedFetch(`/api/private/plan/${encodeURIComponent(p.id)}`, {
            method: "DELETE",
          });
          setPlans((prev) => prev.filter((x) => x.id !== p.id));
        } catch (e: any) {
          alert("Error eliminando: " + String(e.message || e));
        }
      }}
    >
      Eliminar
    </button>
  </div>

  {share ? (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-black/40 px-3 py-2">
      <div className="text-xs text-white/80 truncate">{share}</div>
      <button
        className="rounded-xl bg-white text-slate-950 px-3 py-2 text-xs font-semibold hover:opacity-90"
        onClick={async () => {
          await navigator.clipboard.writeText(share);
          alert("Copiado ✅");
        }}
      >
        Copiar
      </button>
    </div>
  ) : (
    <div className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white/80">
      No publicado (todavía no hay link)
    </div>
  )}
</div>

                  </div>

                  {/* (por ahora) no editamos, después lo hacemos clickeable */}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Expired() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-2xl font-semibold">Esta invitación ya no está disponible</h1>
      <p className="text-white/70 mt-2">Pedile a la persona que te comparta un link nuevo.</p>
      <button className="mt-4 rounded-2xl bg-white text-slate-950 px-4 py-2" onClick={() => navigate("/")}>
        Volver
      </button>
    </div>
  );
}

const fadeSlide = {
  initial: { opacity: 0, y: 16, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(6px)" },
};

function OptionCard({
  label,
  imageUrl,
  onPick,
  disabled,
}: {
  label: string;
  imageUrl?: string | null;
  onPick: () => void;
  disabled: boolean;
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onPick}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.99 }}
      className={
        "relative h-[42vh] md:h-[52vh] w-full overflow-hidden rounded-3xl border border-white/15 shadow-2xl " +
        "bg-white/5 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white/60 " +
        (disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer")
      }
    >
      {imageUrl ? (
        <img src={imageUrl} alt={label} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="absolute inset-0 bg-white/10" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
      <div className="absolute left-5 right-5 bottom-5">
        <div className="text-sm text-white/70">Elegí</div>
        <div className="text-2xl md:text-3xl font-semibold text-white">{label}</div>
      </div>
    </motion.button>
  );
}

function Invite() {
  const code = window.location.pathname.split("/").pop() || "";
  const [plan, setPlan] = React.useState<PublicPlan | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [idx, setIdx] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<{ invitation_text?: string } | null>(null);

  const orderedQuestions = React.useMemo(() => {
    if (!plan || plan.status !== "ok") return [];
    return plan.questions.slice().sort((a, b) => a.ord - b.ord);
  }, [plan]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/plan/${encodeURIComponent(code)}`);
        const data = (await res.json()) as PublicPlan;
        if (!cancelled) setPlan(data);
      } catch {
        if (!cancelled) setPlan({ status: "error" } as any);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  function restart() {
    setIdx(0);
    setBusy(false);
    setAnswers({});
    setResult(null);
  }

  async function finalize(finalAnswers: Record<string, string>) {
    const res = await fetch(`/api/public/submit/${encodeURIComponent(code)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: finalAnswers }),
    });
    const data = await res.json();
    setResult(data);
  }

  if (loading) return <div className="min-h-screen bg-slate-950 text-white p-8">Cargando…</div>;

  if (!plan || plan.status !== "ok") {
    navigate("/expired");
    return null;
  }

  const total = orderedQuestions.length;
  const done = idx >= total;
  const q = orderedQuestions[idx];

  async function pick(optionId: string) {
    if (busy) return;
    setBusy(true);

    const nextAnswers = { ...answers, [q.id]: optionId };
    setAnswers(nextAnswers);

    window.setTimeout(async () => {
      const next = idx + 1;
      setIdx(next);
      setBusy(false);

      if (next >= total) {
        await finalize(nextAnswers);
      }
    }, 220);
  }

  // ✅ Fondo full-screen tomado del plan
  const bgUrl = (plan.plan as any).background_image_url ?? null;

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* ✅ Fondo wallpaper (atrás de todo) */}
      {bgUrl ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950" />
      )}

      {/* ✅ Overlay para que se lea (subí/bajá opacidad) */}
      <div className="absolute inset-0 bg-slate-950/55" />

      {/* ✅ Contenido arriba del fondo */}
      <div className="relative">
        <div className="mx-auto max-w-6xl px-5 py-7 md:py-10">
          <header className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs tracking-widest text-white/60">INVITACIÓN</div>
              <div className="text-lg md:text-xl font-semibold">
                {plan.plan.person_name ? `Plan para ${plan.plan.person_name}` : plan.plan.title}
              </div>
            </div>
            <button
              className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
              onClick={restart}
            >
              Reiniciar
            </button>
          </header>

          <main className="mt-7">
            <AnimatePresence mode="wait">
              {!done ? (
                <motion.section
                  key={q.id}
                  {...fadeSlide}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-5"
                >
                  <div className="space-y-1">
                    <div className="text-3xl md:text-5xl font-semibold leading-tight">
                      {q.title || "¿Qué preferís?"}
                    </div>
                    <div className="text-white/70 text-base md:text-lg">{q.subtitle || ""}</div>
                    <div className="text-xs text-white/60 mt-1">
                      {idx + 1} / {total}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {q.options
                      .slice()
                      .sort((a, b) => a.ord - b.ord)
                      .slice(0, 2)
                      .map((o) => (
                        <OptionCard
                          key={o.id}
                          label={o.label === EMPTY ? "" : o.label || ""}
                          imageUrl={o.image_url}
                          disabled={busy}
                          onPick={() => pick(o.id)}
                        />
                      ))}
                  </div>
                </motion.section>
              ) : (
                <motion.section
                  key="result"
                  {...fadeSlide}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <div className="text-3xl md:text-5xl font-semibold leading-tight">Listo 😄</div>
                    <div className="text-white/70 text-base md:text-lg">Acá está tu invitación final.</div>
                  </div>

                  <div className="rounded-3xl border border-white/15 bg-white/5 p-5 md:p-7 shadow-2xl">
                    <pre className="whitespace-pre-wrap text-base md:text-lg leading-relaxed text-white/90">
                      {(result?.invitation_text ? result.invitation_text.replace(/\\n/g, "\n") : "Generando…")}
                    </pre>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const path = usePath();
  const session = useSession();

  if (path.startsWith("/invite/")) return <Invite />;
  if (path === "/expired") return <Expired />;

  if (path === "/login") return <Login />;

  if (path === "/plans") {
  if (!session) {
    navigate("/login");
    return null;
  }
  return <MyPlans session={session} />;
}

  if (path === "/create") {
    if (!session) {
      navigate("/login");
      return null;
    }
    return <CreateLinear session={session} />;
  }

  return <Home session={session} />;
}
