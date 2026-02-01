import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const supabase = createClient(supabaseUrl, supabaseAnonKey);


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
            Armás preguntas con dos opciones (con fotos), con branching para decisiones complejas.
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
        else {
          // Si desactivaste confirm email en Supabase, esto ya te deja logueado (o al menos el usuario activo).
          // Si por alguna razón no devuelve sesión, mandamos a login.
          navigate("/create");
        }
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

function CreateCanvas({ session }: { session: Session }) {
  type PlanRow = { id: string; title: string; person_name: string | null; status: string; start_question_id: string | null };
  type QuestionRow = { id: string; plan_id: string; ord: number; title: string; subtitle: string | null };
  type OptionRow = { id: string; question_id: string; ord: number; label: string; image_url: string | null; next_question_id: string | null };

  // ---------- authed fetch ----------
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
    if (!res.ok) {
      throw new Error((data && (data.detail || data.error || data.message)) ? JSON.stringify(data) : "Request failed");
    }
    return data;
  }

  // ---------- state ----------
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Plan meta
  const [plan, setPlan] = React.useState<PlanRow | null>(null);
  const [title, setTitle] = React.useState("");
  const [personName, setPersonName] = React.useState("");

  // Graph data
  const [questions, setQuestions] = React.useState<QuestionRow[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = React.useState<Record<string, OptionRow[]>>({});

  // “Finaliza” explícito (porque next_question_id null es ambiguo)
  const [ends, setEnds] = React.useState<Record<string, boolean>>({});

  // Selection
  const [selectedQid, setSelectedQid] = React.useState<string | null>(null);

  // Modal/inline create question from an option
  const [linkFromOption, setLinkFromOption] = React.useState<{ optionId: string; fromQid: string } | null>(null);
  const [newQTitle, setNewQTitle] = React.useState("¿Qué preferís?");
  const [newQSubtitle, setNewQSubtitle] = React.useState("");
  const [newA, setNewA] = React.useState({ label: "", image_url: "" });
  const [newB, setNewB] = React.useState({ label: "", image_url: "" });

  const [shareUrl, setShareUrl] = React.useState<string | null>(null);

  // ---------- helpers ----------
  const optsForSelected = selectedQid ? (optionsByQuestion[selectedQid] || []) : [];

  function optionIsResolved(o: OptionRow) {
    // resuelta si: apunta a otra pregunta, o el usuario marcó “Finaliza”
    return Boolean(o.next_question_id) || Boolean(ends[o.id]);
  }

  const canPublish =
    plan?.id &&
    questions.length > 0 &&
    questions.every((q) => (optionsByQuestion[q.id] || []).length === 2 && (optionsByQuestion[q.id] || []).every(optionIsResolved));

  // Auto-layout simple por “profundidad” calculada desde start question
  const layout = React.useMemo(() => {
    const nodes = questions.slice().sort((a, b) => a.ord - b.ord);

    const start = plan?.start_question_id || nodes[0]?.id || null;
    const depth: Record<string, number> = {};
    if (start) depth[start] = 0;

    // BFS/propagación (ignora edges a null)
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 2000) {
      changed = false;
      for (const q of nodes) {
        const d = depth[q.id];
        if (d == null) continue;
        const opts = optionsByQuestion[q.id] || [];
        for (const o of opts) {
          if (!o.next_question_id) continue;
          const nd = d + 1;
          const prev = depth[o.next_question_id];
          if (prev == null || nd < prev) {
            depth[o.next_question_id] = nd;
            changed = true;
          }
        }
      }
    }

    // Agrupar por depth para asignar y (fila)
    const buckets: Record<number, QuestionRow[]> = {};
    for (const q of nodes) {
      const d = depth[q.id] ?? 0; // si no alcanzable, queda a la izquierda
      (buckets[d] ||= []).push(q);
    }
    for (const d of Object.keys(buckets)) {
      buckets[Number(d)].sort((a, b) => a.ord - b.ord);
    }

    const pos: Record<string, { x: number; y: number }> = {};
    const colWidth = 360;
    const rowHeight = 220;

    Object.entries(buckets).forEach(([dStr, qs]) => {
      const d = Number(dStr);
      qs.forEach((q, i) => {
        pos[q.id] = { x: d * colWidth, y: i * rowHeight };
      });
    });

    return { start, depth, pos, colWidth, rowHeight };
  }, [questions, optionsByQuestion, plan?.start_question_id]);

  // ---------- API actions ----------
  async function createPlan() {
    setError(null);
    setBusy(true);
    try {
      const data = await authedFetch("/api/private/plan", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), person_name: personName.trim() || null }),
      });
      setPlan(data);
      setSelectedQid(null);
      setQuestions([]);
      setOptionsByQuestion({});
      setEnds({});
      setShareUrl(null);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function ensureFirstQuestion() {
    if (!plan?.id) return;
    setError(null);
    setBusy(true);
    try {
      const ord = 1;
      const q = await authedFetch("/api/private/question", {
        method: "POST",
        body: JSON.stringify({ plan_id: plan.id, ord, title: "¿Qué preferís?", subtitle: "Día o Noche" }),
      });

      const opts: OptionRow[] = await authedFetch("/api/private/options2", {
        method: "POST",
        body: JSON.stringify({
          question_id: q.id,
          a: { label: "Día", image_url: null },
          b: { label: "Noche", image_url: null },
        }),
      });

      setQuestions((prev) => [...prev, q]);
      setOptionsByQuestion((prev) => ({ ...prev, [q.id]: opts }));
      setSelectedQid(q.id);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function markEnd(optionId: string) {
    setBusy(true);
    setError(null);
    try {
      // dejamos next_question_id explícitamente en null (y marcamos end local)
      await authedFetch(`/api/private/option/${encodeURIComponent(optionId)}`, {
        method: "PATCH",
        body: JSON.stringify({ next_question_id: null }),
      });
      setEnds((prev) => ({ ...prev, [optionId]: true }));
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  function openCreateFromOption(fromQid: string, optionId: string) {
    setLinkFromOption({ fromQid, optionId });
    setNewQTitle("¿Qué preferís?");
    setNewQSubtitle("");
    setNewA({ label: "", image_url: "" });
    setNewB({ label: "", image_url: "" });
  }

  async function createQuestionFromOption() {
    if (!plan?.id || !linkFromOption) return;
    if (!newA.label.trim() || !newB.label.trim() || !newQSubtitle.trim()) {
      setError("Completá subtítulo y las 2 opciones.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const nextOrd = (questions.reduce((m, q) => Math.max(m, q.ord), 0) || 0) + 1;

      const q = await authedFetch("/api/private/question", {
        method: "POST",
        body: JSON.stringify({
          plan_id: plan.id,
          ord: nextOrd,
          title: newQTitle.trim() || "¿Qué preferís?",
          subtitle: newQSubtitle.trim(),
        }),
      });

      const opts: OptionRow[] = await authedFetch("/api/private/options2", {
        method: "POST",
        body: JSON.stringify({
          question_id: q.id,
          a: { label: newA.label.trim(), image_url: newA.image_url.trim() || null },
          b: { label: newB.label.trim(), image_url: newB.image_url.trim() || null },
        }),
      });

      // Conectar la opción al nuevo nodo
      await authedFetch(`/api/private/option/${encodeURIComponent(linkFromOption.optionId)}`, {
        method: "PATCH",
        body: JSON.stringify({ next_question_id: q.id }),
      });

      // Actualizar estado local
      setQuestions((prev) => [...prev, q]);
      setOptionsByQuestion((prev) => ({ ...prev, [q.id]: opts }));

      // Esta opción ya está resuelta (no es end)
      setEnds((prev) => {
        const copy = { ...prev };
        delete copy[linkFromOption.optionId];
        return copy;
      });

      // También actualizamos la opción local del “fromQid”
      setOptionsByQuestion((prev) => {
        const fromOpts = prev[linkFromOption.fromQid] || [];
        const updated = fromOpts.map((o) => (o.id === linkFromOption.optionId ? { ...o, next_question_id: q.id } : o));
        return { ...prev, [linkFromOption.fromQid]: updated };
      });

      setSelectedQid(q.id);
      setLinkFromOption(null);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function publish(expiresHours: number | null) {
    if (!plan?.id) return;
    setBusy(true);
    setError(null);
    try {
      const data = await authedFetch(`/api/private/plan/${encodeURIComponent(plan.id)}/publish`, {
        method: "PATCH",
        body: JSON.stringify({ expires_in_hours: expiresHours }),
      });
      setShareUrl(data.share_url || null);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  // ---------- UI components ----------
  function NodeCard({ q }: { q: QuestionRow }) {
    const pos = layout.pos[q.id] || { x: 0, y: 0 };
    const selected = q.id === selectedQid;
    const opts = optionsByQuestion[q.id] || [];
    const complete = opts.length === 2 && opts.every(optionIsResolved);

    return (
      <button
        type="button"
        onClick={() => setSelectedQid(q.id)}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        className={
          "absolute w-[320px] rounded-3xl border shadow-2xl text-left p-4 " +
          (selected ? "border-white/50 bg-white/10" : "border-white/15 bg-white/5 hover:bg-white/10")
        }
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs tracking-widest text-white/60">Q{q.ord}</div>
          <div className={"text-xs px-2 py-1 rounded-full border " + (complete ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10" : "border-yellow-400/30 text-yellow-200 bg-yellow-500/10")}>
            {complete ? "Completa" : "Incompleta"}
          </div>
        </div>

        <div className="mt-2 text-lg font-semibold">{q.title || "¿Qué preferís?"}</div>
        <div className="text-white/70 text-sm mt-1">{q.subtitle || ""}</div>

        <div className="mt-4 space-y-2">
          {opts.slice().sort((a, b) => a.ord - b.ord).map((o) => {
            const resolved = optionIsResolved(o);
            const to = o.next_question_id ? `→ Q${(questions.find((x) => x.id === o.next_question_id)?.ord ?? "?")}` : (ends[o.id] ? "→ Fin" : "→ (sin definir)");
            return (
              <div key={o.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="text-white">{o.label}</div>
                <div className={resolved ? "text-white/70" : "text-red-200"}>{to}</div>
              </div>
            );
          })}
        </div>
      </button>
    );
  }

  function EdgesLayer() {
    // dibuja flechas desde cada opción al destino (si existe), o a un “fin” al lado
    const paths: Array<{ d: string; key: string; unresolved?: boolean }> = [];

    for (const q of questions) {
      const fromPos = layout.pos[q.id];
      if (!fromPos) continue;

      const opts = (optionsByQuestion[q.id] || []).slice().sort((a, b) => a.ord - b.ord);
      for (let i = 0; i < opts.length; i++) {
        const o = opts[i];

        // punto de salida por opción (dos “puertos”)
        const x1 = fromPos.x + 320; // borde derecho del nodo
        const y1 = fromPos.y + 140 + i * 22;

        let x2 = x1 + 120;
        let y2 = y1;

        if (o.next_question_id && layout.pos[o.next_question_id]) {
          const toPos = layout.pos[o.next_question_id];
          x2 = toPos.x;         // borde izquierdo del nodo destino
          y2 = toPos.y + 120;   // centro aproximado
        }

        const midX = (x1 + x2) / 2;

        const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
        paths.push({ d, key: `${o.id}`, unresolved: !optionIsResolved(o) });
      }
    }

    return (
      <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox="0 0 3000 2000" preserveAspectRatio="none">
        {paths.map((p) => (
          <path
            key={p.key}
            d={p.d}
            fill="none"
            stroke="currentColor"
            className={p.unresolved ? "text-red-300/50" : "text-white/30"}
            strokeWidth="2"
          />
        ))}
      </svg>
    );
  }

  // Canvas size (simple): columnas * ancho + margen
  const maxX = Math.max(0, ...Object.values(layout.pos).map((p) => p.x));
  const maxY = Math.max(0, ...Object.values(layout.pos).map((p) => p.y));
  const canvasW = maxX + 700;
  const canvasH = maxY + 500;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
        <button className="text-lg font-semibold" onClick={() => navigate("/")}>
          Plan Invitación
        </button>

        <div className="flex items-center gap-3">
          <div className="text-sm text-white/70">{session.user.email}</div>
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

      <main className="mx-auto max-w-7xl px-6 pb-12">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* CANVAS */}
          <div className="rounded-3xl border border-white/15 bg-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-xs tracking-widest text-white/60">CREADOR (CANVAS)</div>
                <div className="text-sm text-white/80">
                  {plan ? `${plan.title}${plan.person_name ? ` · para ${plan.person_name}` : ""}` : "Creá tu plan y armá el diagrama"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!plan ? (
                  <span className="text-xs text-white/60">Primero creá el plan</span>
                ) : (
                  <button
                    disabled={busy}
                    className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                    onClick={ensureFirstQuestion}
                  >
                    + Nodo inicial
                  </button>
                )}
              </div>
            </div>

            <div className="relative overflow-auto" style={{ height: "calc(100vh - 220px)" }}>
              <div className="relative" style={{ width: canvasW, height: canvasH, minWidth: "100%", minHeight: "100%" }}>
                <EdgesLayer />
                {questions.map((q) => (
                  <NodeCard key={q.id} q={q} />
                ))}
              </div>
            </div>
          </div>

          {/* SIDE PANEL */}
          <div className="space-y-6">
            {/* Plan meta */}
            <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
              <div className="text-sm font-semibold">Plan</div>

              {!plan ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-sm text-white/70">Título</div>
                    <input
                      className="mt-2 w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej: Salida sorpresa"
                    />
                  </div>

                  <div>
                    <div className="text-sm text-white/70">Persona (opcional)</div>
                    <input
                      className="mt-2 w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="Ej: Sofi"
                    />
                  </div>

                  <button
                    disabled={busy || !title.trim()}
                    className="w-full rounded-2xl bg-white text-slate-950 px-4 py-3 font-semibold disabled:opacity-50"
                    onClick={createPlan}
                  >
                    {busy ? "Creando…" : "Crear plan"}
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-sm text-white/70">
                  Estado: <span className="text-white">{plan.status}</span>
                </div>
              )}
            </div>

            {/* Node editor */}
            <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
              <div className="text-sm font-semibold">Editor</div>

              {!selectedQid ? (
                <div className="mt-3 text-white/70 text-sm">
                  Seleccioná un nodo del canvas para editar sus conexiones.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="text-sm text-white/70">
                    {questions.find((q) => q.id === selectedQid)?.subtitle || "—"}
                  </div>

                  {(optsForSelected.slice().sort((a, b) => a.ord - b.ord)).map((o) => {
                    const resolved = optionIsResolved(o);
                    const isEnd = Boolean(ends[o.id]);
                    return (
                      <div key={o.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold">{o.label}</div>
                          <div className={"text-xs px-2 py-1 rounded-full border " + (resolved ? "border-emerald-400/30 text-emerald-200 bg-emerald-500/10" : "border-red-400/30 text-red-200 bg-red-500/10")}>
                            {resolved ? (isEnd ? "Fin" : "Conectada") : "Sin definir"}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            disabled={busy}
                            className="rounded-2xl bg-white/10 border border-white/15 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                            onClick={() => openCreateFromOption(selectedQid, o.id)}
                          >
                            Crear pregunta y conectar
                          </button>

                          <button
                            disabled={busy}
                            className="rounded-2xl bg-white text-slate-950 px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                            onClick={() => markEnd(o.id)}
                          >
                            Finaliza
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {linkFromOption && (
                    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                      <div className="text-sm font-semibold">Nueva pregunta (conectar)</div>
                      <div className="mt-3 space-y-2">
                        <input
                          className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                          value={newQTitle}
                          onChange={(e) => setNewQTitle(e.target.value)}
                          placeholder="¿Qué preferís?"
                        />
                        <input
                          className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                          value={newQSubtitle}
                          onChange={(e) => setNewQSubtitle(e.target.value)}
                          placeholder="Ej: Cena mexicana o china"
                        />

                        <div className="grid grid-cols-1 gap-2">
                          <input
                            className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                            value={newA.label}
                            onChange={(e) => setNewA((p) => ({ ...p, label: e.target.value }))}
                            placeholder="Opción A"
                          />
                          <input
                            className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                            value={newA.image_url}
                            onChange={(e) => setNewA((p) => ({ ...p, image_url: e.target.value }))}
                            placeholder="URL imagen A (opcional)"
                          />
                          <input
                            className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                            value={newB.label}
                            onChange={(e) => setNewB((p) => ({ ...p, label: e.target.value }))}
                            placeholder="Opción B"
                          />
                          <input
                            className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                            value={newB.image_url}
                            onChange={(e) => setNewB((p) => ({ ...p, image_url: e.target.value }))}
                            placeholder="URL imagen B (opcional)"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            disabled={busy}
                            className="flex-1 rounded-2xl bg-white text-slate-950 px-4 py-3 font-semibold disabled:opacity-50"
                            onClick={createQuestionFromOption}
                          >
                            {busy ? "Creando…" : "Crear y conectar"}
                          </button>
                          <button
                            disabled={busy}
                            className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3"
                            onClick={() => setLinkFromOption(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Publish */}
            <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
              <div className="text-sm font-semibold">Publicar</div>
              <div className="mt-2 text-sm text-white/70">
                {canPublish ? "Listo para publicar ✅" : "Faltan conexiones (cada opción debe ir a otra pregunta o finalizar)."}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  disabled={busy || !canPublish}
                  className="rounded-2xl bg-white text-slate-950 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  onClick={() => publish(null)}
                >
                  Publicar
                </button>
                <button
                  disabled={busy || !canPublish}
                  className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                  onClick={() => publish(24)}
                >
                  Publicar (24h)
                </button>
              </div>

              {shareUrl && (
                <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-3">
                  <div className="text-xs text-white/60">Link</div>
                  <div className="mt-1 font-mono text-sm break-all">
                    {window.location.origin}{shareUrl}
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
        </div>
      </main>
    </div>
  );
}



function Expired() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-2xl font-semibold">Esta invitación ya no está disponible</h1>
      <p className="text-white/70 mt-2">Pedile a la persona que te comparta un link nuevo.</p>
      <button
        className="mt-4 rounded-2xl bg-white text-slate-950 px-4 py-2"
        onClick={() => navigate("/")}
      >
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

  const [currentQuestionId, setCurrentQuestionId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<{ invitation_text?: string } | null>(null);

  // Cache start id so restart() can work even if currentQuestionId becomes null at the end
  const startQuestionId = React.useMemo(() => {
    if (!plan || plan.status !== "ok") return null;
    return plan.plan.start_question_id;
  }, [plan]);

  const questionById = React.useMemo(() => {
    if (!plan || plan.status !== "ok") return new Map<string, (typeof plan.questions)[number]>();
    return new Map(plan.questions.map((q) => [q.id, q]));
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
        if (!cancelled) setPlan({ status: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Set initial question once plan is loaded
  React.useEffect(() => {
    if (plan && plan.status === "ok") {
      setCurrentQuestionId(plan.plan.start_question_id);
    }
  }, [plan]);

  function restart() {
    setBusy(false);
    setAnswers({});
    setResult(null);
    setCurrentQuestionId(startQuestionId);
  }

  async function finalize() {
    const res = await fetch(`/api/public/submit/${encodeURIComponent(code)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json();
    setResult(data);
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white p-8">Cargando…</div>;
  }

  if (!plan || plan.status !== "ok") {
    navigate("/expired");
    return null;
  }

  // If start_question_id is null, the plan is misconfigured
  if (!startQuestionId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <h1 className="text-2xl font-semibold">Plan inválido</h1>
        <p className="text-white/70 mt-2">No tiene pregunta de inicio configurada.</p>
        <button className="mt-4 rounded-2xl bg-white text-slate-950 px-4 py-2" onClick={() => navigate("/")}>
          Volver
        </button>
      </div>
    );
  }

  const done = currentQuestionId === null;
  const q = currentQuestionId ? questionById.get(currentQuestionId) : null;

  // Progreso: cantidad de respuestas hechas (en branching no siempre recorre todas las questions del plan)
  const answeredCount = Object.keys(answers).length;
  const totalPossible = plan.questions.length;

  async function pick(option: { id: string; next_question_id: string | null }) {
    if (!q || busy) return;
    setBusy(true);

    // 1) Guardar respuesta para la pregunta actual
    setAnswers((prev) => ({ ...prev, [q.id]: option.id }));

    // 2) Animación + avanzar por branching
    window.setTimeout(async () => {
      setBusy(false);

      if (option.next_question_id) {
        setCurrentQuestionId(option.next_question_id);
      } else {
        // Opción A: null => termina el flujo
        setCurrentQuestionId(null);
        await finalize();
      }
    }, 220);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-5 py-7 md:py-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs tracking-widest text-white/60">INVITACIÓN</div>
            <div className="text-lg md:text-xl font-semibold">
              {plan.plan.person_name ? `Plan para ${plan.plan.person_name}` : plan.plan.title}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
              onClick={restart}
            >
              Reiniciar
            </button>
          </div>
        </header>

        <main className="mt-7">
          <AnimatePresence mode="wait">
            {!done && q ? (
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
                    {answeredCount + 1} / {totalPossible}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {q.options.slice(0, 2).map((o) => (
                    <OptionCard
                      key={o.id}
                      label={o.label}
                      imageUrl={o.image_url}
                      disabled={busy}
                      onPick={() => pick({ id: o.id, next_question_id: o.next_question_id })}
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
                    {result?.invitation_text || "Generando…"}
                  </pre>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      className="rounded-2xl bg-white text-slate-950 px-4 py-2 text-sm hover:opacity-90"
                      onClick={async () => {
                        await navigator.clipboard.writeText(result?.invitation_text || "");
                        alert("Copiado ✅");
                      }}
                      disabled={!result?.invitation_text}
                    >
                      Copiar invitación
                    </button>
                    <button
                      className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
                      onClick={restart}
                    >
                      Volver a elegir
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
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

  if (path === "/create") {
    if (!session) {
      navigate("/login");
      return null;
    }
    return <CreateCanvas session={session} />;
  }

  return <Home session={session} />;
}

