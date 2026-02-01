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
  type PlanRow = {
    id: string;
    title: string;
    person_name: string | null;
    status: string;
    start_question_id: string | null;
  };
  type QuestionRow = { id: string; plan_id: string; ord: number; title: string; subtitle: string | null };
  type OptionRow = {
    id: string;
    question_id: string;
    ord: number;
    label: string;
    image_url: string | null;
    next_question_id: string | null;
  };

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

  const [plan, setPlan] = React.useState<PlanRow | null>(null);
  const [title, setTitle] = React.useState("");
  const [personName, setPersonName] = React.useState("");

  const [questions, setQuestions] = React.useState<QuestionRow[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = React.useState<Record<string, OptionRow[]>>({});

  const [selectedQid, setSelectedQid] = React.useState<string | null>(null);
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);

  // Modal crear nueva pregunta y conectar
  const [linkFrom, setLinkFrom] = React.useState<{ fromQid: string; optionId: string } | null>(null);
  const [newSubtitle, setNewSubtitle] = React.useState("");
  const [newA, setNewA] = React.useState({ label: "", image_url: "" });
  const [newB, setNewB] = React.useState({ label: "", image_url: "" });

  const selectedQ = selectedQid ? questions.find((q) => q.id === selectedQid) : null;
  const selectedOpts = selectedQid ? (optionsByQuestion[selectedQid] || []).slice().sort((a, b) => a.ord - b.ord) : [];

  // ---------- derived helpers ----------
  function getOpts(qid: string) {
    return (optionsByQuestion[qid] || []).slice().sort((a, b) => a.ord - b.ord);
  }

  function getOptionPair(qid: string) {
    const opts = getOpts(qid);
    return { a: opts[0] ?? null, b: opts[1] ?? null };
  }

  function isTwoOptionsReady(qid: string) {
    const opts = getOpts(qid);
    return opts.length === 2 && Boolean(opts[0]?.label) && Boolean(opts[1]?.label);
  }

  // Terminal = no hay salida para esa opción (next_question_id null)
  function isTerminalOption(o: OptionRow) {
    return o.next_question_id === null;
  }

  // “flecha abajo” si A y B van a la misma next (y no es null)
  function isSharedNext(qid: string) {
    const { a, b } = getOptionPair(qid);
    if (!a || !b) return false;
    if (!a.next_question_id || !b.next_question_id) return false;
    return a.next_question_id === b.next_question_id;
  }

  // Publicar: requerido
  // - plan existe
  // - hay start_question_id definido (manual)
  // - todas las questions tienen 2 options
  // - no hay ciclos desde start
  const canPublish = React.useMemo(() => {
    if (!plan?.id) return false;
    if (!plan.start_question_id) return false;
    if (questions.length === 0) return false;
    for (const q of questions) if (!isTwoOptionsReady(q.id)) return false;

    // ciclo check desde start (DFS)
    const visited = new Set<string>();
    const stack = new Set<string>();

    const byId = new Map(questions.map((q) => [q.id, q]));
    function dfs(qid: string): boolean {
      if (stack.has(qid)) return false; // ciclo
      if (visited.has(qid)) return true;
      visited.add(qid);
      stack.add(qid);

      const opts = getOpts(qid);
      for (const o of opts) {
        if (o.next_question_id && byId.has(o.next_question_id)) {
          if (!dfs(o.next_question_id)) return false;
        }
      }

      stack.delete(qid);
      return true;
    }

    return dfs(plan.start_question_id);
  }, [plan, questions, optionsByQuestion]);

  // ---------- layout vertical tipo “canvas” ----------
  // Objetivo: colocar nodos por niveles (depth) hacia abajo, con offset horizontal según rama.
  // Soporta convergencia: si dos caminos llegan al mismo nodo, lo ubica una sola vez.
  const layout = React.useMemo(() => {
    const nodeW = 420;
    const nodeH = 120;
    const gapY = 90;
    const gapX = 140;

    const byId = new Map(questions.map((q) => [q.id, q]));
    const start = plan?.start_question_id || null;

    // Calculamos depth mínimo desde start.
    const depth: Record<string, number> = {};
    if (start) depth[start] = 0;

    let changed = true;
    let guard = 0;
    while (changed && guard++ < 4000) {
      changed = false;
      for (const q of questions) {
        const d = depth[q.id];
        if (d == null) continue;
        const opts = getOpts(q.id);
        for (const o of opts) {
          if (!o.next_question_id) continue;
          if (!byId.has(o.next_question_id)) continue;
          const nd = d + 1;
          const prev = depth[o.next_question_id];
          if (prev == null || nd < prev) {
            depth[o.next_question_id] = nd;
            changed = true;
          }
        }
      }
    }

    // Ahora posicionamos.
    // Para “parecer” al ejemplo: start centrado; si se bifurca, izquierda/derecha.
    // Regla:
    // - Si sharedNext: el hijo va al centro debajo.
    // - Si no shared: hijo de A va a la izquierda, hijo de B a la derecha.
    // Convergencia: si un nodo ya tiene pos, no lo movemos (MVP).
    const pos: Record<string, { x: number; y: number }> = {};

    const startX = 900; // centro “virtual” del canvas
    if (start && byId.has(start)) pos[start] = { x: startX, y: 60 };

    // Orden por depth asc para ir ubicando
    const nodesSorted = questions.slice().sort((a, b) => (depth[a.id] ?? 9999) - (depth[b.id] ?? 9999));

    for (const q of nodesSorted) {
      if (!pos[q.id]) {
        // si no alcanzable, lo ponemos al costado abajo (draft)
        pos[q.id] = { x: 60, y: 60 + (depth[q.id] ?? 0) * (nodeH + gapY) };
      }

      const parentPos = pos[q.id];
      const { a, b } = getOptionPair(q.id);
      if (!a || !b) continue;

      const nextA = a.next_question_id && byId.has(a.next_question_id) ? a.next_question_id : null;
      const nextB = b.next_question_id && byId.has(b.next_question_id) ? b.next_question_id : null;

      if (nextA && nextB && nextA === nextB) {
        // shared next: debajo centro
        const child = nextA;
        if (!pos[child]) {
          pos[child] = { x: parentPos.x, y: parentPos.y + (nodeH + gapY) };
        }
      } else {
        // split
        if (nextA && !pos[nextA]) {
          pos[nextA] = { x: parentPos.x - (nodeW + gapX), y: parentPos.y + (nodeH + gapY) };
        }
        if (nextB && !pos[nextB]) {
          pos[nextB] = { x: parentPos.x + (nodeW + gapX), y: parentPos.y + (nodeH + gapY) };
        }
      }
    }

    // bounds
    const xs = Object.values(pos).map((p) => p.x);
    const ys = Object.values(pos).map((p) => p.y);
    const minX = xs.length ? Math.min(...xs) : 0;
    const maxX = xs.length ? Math.max(...xs) : 1200;
    const minY = ys.length ? Math.min(...ys) : 0;
    const maxY = ys.length ? Math.max(...ys) : 800;

    const canvasW = (maxX - minX) + nodeW + 600;
    const canvasH = (maxY - minY) + nodeH + 400;

    return { pos, nodeW, nodeH, canvasW, canvasH, start, minX, minY };
  }, [questions, optionsByQuestion, plan?.start_question_id]);

  // ---------- actions ----------
  async function createPlan() {
    setError(null);
    setBusy(true);
    try {
      const data = await authedFetch("/api/private/plan", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), person_name: personName.trim() || null }),
      });

      // IMPORTANTE: no asumimos start_question_id como válido.
      // Lo dejamos como venga, pero el UI exige que el usuario lo marque.
      setPlan(data);
      setQuestions([]);
      setOptionsByQuestion({});
      setSelectedQid(null);
      setShareUrl(null);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function addNodeInitial() {
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
          subtitle: "Nueva decisión",
        }),
      });

      const opts: OptionRow[] = await authedFetch("/api/private/options2", {
        method: "POST",
        body: JSON.stringify({
          question_id: q.id,
          a: { label: "Opción A", image_url: null },
          b: { label: "Opción B", image_url: null },
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

  async function setAsStart(qid: string) {
    if (!plan?.id) return;
    setBusy(true);
    setError(null);
    try {
      // Necesitás que el worker tenga este endpoint (si ya lo tenés, genial):
      // PATCH /api/private/plan/:id  { start_question_id: qid }
      const updated: PlanRow = await authedFetch(`/api/private/plan/${encodeURIComponent(plan.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ start_question_id: qid }),
      });
      setPlan(updated);
    } catch (e: any) {
      // fallback: si tu worker no lo tiene todavía, te lo digo en el error
      setError(
        "No pude marcar inicio. Asegurate de tener PATCH /api/private/plan/:id para setear start_question_id.\n" +
          String(e.message || e)
      );
    } finally {
      setBusy(false);
    }
  }

  async function connectOption(fromQid: string, optionId: string, toQid: string | null) {
    setBusy(true);
    setError(null);
    try {
      await authedFetch(`/api/private/option/${encodeURIComponent(optionId)}`, {
        method: "PATCH",
        body: JSON.stringify({ next_question_id: toQid }),
      });

      setOptionsByQuestion((prev) => {
        const list = prev[fromQid] || [];
        return {
          ...prev,
          [fromQid]: list.map((o) => (o.id === optionId ? { ...o, next_question_id: toQid } : o)),
        };
      });
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function connectBothTo(fromQid: string, toQid: string | null) {
    const opts = getOpts(fromQid);
    if (opts.length !== 2) return;
    await connectOption(fromQid, opts[0].id, toQid);
    await connectOption(fromQid, opts[1].id, toQid);
  }

  function openCreateFromOption(fromQid: string, optionId: string) {
    setLinkFrom({ fromQid, optionId });
    setNewSubtitle("");
    setNewA({ label: "", image_url: "" });
    setNewB({ label: "", image_url: "" });
  }

  async function createNodeAndConnect() {
    if (!plan?.id || !linkFrom) return;
    if (!newSubtitle.trim() || !newA.label.trim() || !newB.label.trim()) {
      setError("Completá la pregunta (subtítulo) y las 2 opciones.");
      return;
    }

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
          subtitle: newSubtitle.trim(),
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

      // conectar la opción origen al nuevo nodo
      await connectOption(linkFrom.fromQid, linkFrom.optionId, q.id);

      setQuestions((prev) => [...prev, q]);
      setOptionsByQuestion((prev) => ({ ...prev, [q.id]: opts }));
      setSelectedQid(q.id);
      setLinkFrom(null);
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

  // ---------- Canvas rendering ----------
  function Node({ q }: { q: QuestionRow }) {
    const p = layout.pos[q.id] || { x: 100, y: 100 };
    const opts = getOpts(q.id);
    const { a, b } = getOptionPair(q.id);

    const isStart = plan?.start_question_id === q.id;

    return (
      <button
        type="button"
        onClick={() => setSelectedQid(q.id)}
        style={{ transform: `translate(${p.x - layout.minX + 200}px, ${p.y - layout.minY + 60}px)` }}
        className={
          "absolute text-left rounded-2xl border shadow-xl " +
          (selectedQid === q.id ? "border-white/60 bg-white/10" : "border-white/15 bg-white/5 hover:bg-white/10")
        }
      >
        <div className="px-4 pt-3 pb-3" style={{ width: 420 }}>
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/60">Q{q.ord}</div>
            {isStart ? (
              <span className="text-xs px-2 py-1 rounded-full border border-emerald-400/40 text-emerald-200 bg-emerald-500/10">
                INICIO
              </span>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full border border-white/15 text-white/60">
                decisión
              </span>
            )}
          </div>

          <div className="mt-2 text-sm font-semibold uppercase tracking-wide">
            {(q.subtitle || "Nueva decisión").toUpperCase()}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm">
              {a?.label ?? "—"}
            </div>
            <div className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-right">
              {b?.label ?? "—"}
            </div>
          </div>

          {/* puertos visuales (solo decorativos) */}
          <div className="relative mt-3 h-4">
            {/* izquierda */}
            <div className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white/35" />
            {/* abajo */}
            <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white/35" />
            {/* derecha */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white/35" />
          </div>

          {/* hints terminal */}
          {opts.length === 2 && (
            <div className="mt-2 text-[11px] text-white/50 flex items-center justify-between">
              <span>{isTerminalOption(opts[0]) ? "izq termina" : ""}</span>
              <span>{isTerminalOption(opts[1]) ? "der termina" : ""}</span>
            </div>
          )}
        </div>
      </button>
    );
  }

  function Edges() {
    const lines: Array<{ d: string; key: string }> = [];
    const byId = new Map(questions.map((q) => [q.id, q]));

    const nodeW = 420;
    const nodeH = 120;

    function nodeToScreen(qid: string) {
      const p = layout.pos[qid];
      if (!p) return null;
      const x = (p.x - layout.minX + 200);
      const y = (p.y - layout.minY + 60);
      return { x, y };
    }

    for (const q of questions) {
      const pFrom = nodeToScreen(q.id);
      if (!pFrom) continue;

      const { a, b } = getOptionPair(q.id);
      if (!a || !b) continue;

      const nextA = a.next_question_id && byId.has(a.next_question_id) ? a.next_question_id : null;
      const nextB = b.next_question_id && byId.has(b.next_question_id) ? b.next_question_id : null;

      // puntos de salida (izq / abajo / der)
      const outLeft = { x: pFrom.x + 8, y: pFrom.y + 92 };
      const outRight = { x: pFrom.x + nodeW - 8, y: pFrom.y + 92 };
      const outBottom = { x: pFrom.x + nodeW / 2, y: pFrom.y + nodeH + 6 };

      // destino: entrar arriba centro del nodo hijo
      const mkCurve = (x1: number, y1: number, x2: number, y2: number) => {
        const midY = (y1 + y2) / 2;
        return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
      };

      if (nextA && nextB && nextA === nextB) {
        // shared: flecha abajo
        const pTo = nodeToScreen(nextA);
        if (pTo) {
          const inTop = { x: pTo.x + nodeW / 2, y: pTo.y - 8 };
          lines.push({
            key: `${q.id}-shared-${nextA}`,
            d: mkCurve(outBottom.x, outBottom.y, inTop.x, inTop.y),
          });
        }
      } else {
        if (nextA) {
          const pTo = nodeToScreen(nextA);
          if (pTo) {
            const inTop = { x: pTo.x + nodeW / 2, y: pTo.y - 8 };
            lines.push({
              key: `${a.id}-A-${nextA}`,
              d: mkCurve(outLeft.x, outLeft.y, inTop.x, inTop.y),
            });
          }
        }
        if (nextB) {
          const pTo = nodeToScreen(nextB);
          if (pTo) {
            const inTop = { x: pTo.x + nodeW / 2, y: pTo.y - 8 };
            lines.push({
              key: `${b.id}-B-${nextB}`,
              d: mkCurve(outRight.x, outRight.y, inTop.x, inTop.y),
            });
          }
        }
      }
    }

    return (
      <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox={`0 0 ${layout.canvasW} ${layout.canvasH}`} preserveAspectRatio="none">
        {lines.map((l) => (
          <path key={l.key} d={l.d} fill="none" stroke="currentColor" className="text-white/35" strokeWidth="2" />
        ))}
      </svg>
    );
  }

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
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 whitespace-pre-wrap">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
          {/* CANVAS */}
          <div className="rounded-3xl border border-white/15 bg-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-xs tracking-widest text-white/60">CREADOR (CANVAS)</div>
                <div className="text-sm text-white/80">
                  {plan ? `${plan.title}${plan.person_name ? ` · para ${plan.person_name}` : ""}` : "Creá tu plan y armá el diagrama"}
                </div>
                {plan && !plan.start_question_id && (
                  <div className="text-xs text-yellow-200/80 mt-1">
                    ⚠️ Marcá manualmente el nodo de inicio (seleccioná uno y “Marcar como inicio”).
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!plan ? (
                  <span className="text-xs text-white/60">Primero creá el plan</span>
                ) : (
                  <button
                    disabled={busy}
                    className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                    onClick={addNodeInitial}
                  >
                    + Agregar decisión
                  </button>
                )}
              </div>
            </div>

            <div className="relative overflow-auto" style={{ height: "calc(100vh - 220px)" }}>
              <div className="relative" style={{ width: layout.canvasW, height: layout.canvasH, minWidth: "100%", minHeight: "100%" }}>
                <Edges />
                {questions.map((q) => (
                  <Node key={q.id} q={q} />
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
                      placeholder="Ej: San Valentín"
                    />
                  </div>

                  <div>
                    <div className="text-sm text-white/70">Persona (opcional)</div>
                    <input
                      className="mt-2 w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="Ej: Matito"
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
                  <div className="mt-2 text-xs text-white/60">
                    Inicio: {plan.start_question_id ? "definido ✅" : "no definido"}
                  </div>
                </div>
              )}
            </div>

            {/* Editor */}
            <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
              <div className="text-sm font-semibold">Editor</div>

              {!selectedQ ? (
                <div className="mt-3 text-white/70 text-sm">Seleccioná un nodo para editar conexiones.</div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-white/60">Nodo</div>
                      <div className="text-sm font-semibold">{selectedQ.subtitle || "Nueva decisión"}</div>
                    </div>

                    <button
                      disabled={busy}
                      className="rounded-2xl bg-white text-slate-950 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                      onClick={() => setAsStart(selectedQ.id)}
                    >
                      Marcar como inicio
                    </button>
                  </div>

                  {selectedOpts.length === 2 ? (
                    <>
                      {/* Conectar ambas */}
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs text-white/60 mb-2">
                          Si la siguiente decisión es la misma para ambas opciones → flecha abajo
                        </div>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 rounded-2xl bg-white/10 border border-white/15 px-3 py-2 text-sm outline-none"
                            disabled={busy}
                            defaultValue=""
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) return;
                              connectBothTo(selectedQ.id, v);
                              e.currentTarget.value = "";
                            }}
                          >
                            <option value="" disabled>
                              Conectar ambas a…
                            </option>
                            {questions
                              .filter((q) => q.id !== selectedQ.id)
                              .sort((a, b) => a.ord - b.ord)
                              .map((q) => (
                                <option key={q.id} value={q.id}>
                                  Q{q.ord} · {q.subtitle || q.title || "Sin título"}
                                </option>
                              ))}
                          </select>

                          <button
                            disabled={busy}
                            className="rounded-2xl bg-white/10 border border-white/15 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                            onClick={() => connectBothTo(selectedQ.id, null)}
                          >
                            Terminar ambas
                          </button>
                        </div>

                        {isSharedNext(selectedQ.id) && (
                          <div className="mt-2 text-xs text-emerald-200/80">
                            ✅ Ambas opciones conectan al mismo nodo (se dibuja flecha abajo)
                          </div>
                        )}
                      </div>

                      {/* Conectar individual */}
                      {selectedOpts.map((o, idx) => (
                        <div key={o.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">{idx === 0 ? "Izquierda" : "Derecha"}: {o.label}</div>
                            <div className="text-xs text-white/60">
                              {o.next_question_id ? "conectada" : "termina"}
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            <div className="flex gap-2">
                              <select
                                className="flex-1 rounded-2xl bg-white/10 border border-white/15 px-3 py-2 text-sm outline-none"
                                disabled={busy}
                                value={o.next_question_id ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  connectOption(selectedQ.id, o.id, v || null);
                                }}
                              >
                                <option value="">(Termina aquí)</option>
                                {questions
                                  .filter((q) => q.id !== selectedQ.id)
                                  .sort((a, b) => a.ord - b.ord)
                                  .map((q) => (
                                    <option key={q.id} value={q.id}>
                                      Q{q.ord} · {q.subtitle || q.title || "Sin título"}
                                    </option>
                                  ))}
                              </select>

                              <button
                                disabled={busy}
                                className="rounded-2xl bg-white/10 border border-white/15 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                                onClick={() => openCreateFromOption(selectedQ.id, o.id)}
                              >
                                + Crear y conectar
                              </button>
                            </div>

                            <div className="text-xs text-white/50">
                              Si esta conexión queda en “Termina aquí”, esa rama termina sin nodo FIN.
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-sm text-white/70">
                      Este nodo todavía no tiene 2 opciones (algo falló al crearlo).
                    </div>
                  )}

                  {linkFrom && (
                    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                      <div className="text-sm font-semibold">Crear nueva decisión</div>

                      <div className="mt-3 space-y-2">
                        <input
                          className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                          value={newSubtitle}
                          onChange={(e) => setNewSubtitle(e.target.value)}
                          placeholder="Ej: ¿Qué cena preferís?"
                        />

                        <div className="grid grid-cols-1 gap-2">
                          <input
                            className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                            value={newA.label}
                            onChange={(e) => setNewA((p) => ({ ...p, label: e.target.value }))}
                            placeholder="Opción izquierda"
                          />
                          <input
                            className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                            value={newB.label}
                            onChange={(e) => setNewB((p) => ({ ...p, label: e.target.value }))}
                            placeholder="Opción derecha"
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            disabled={busy}
                            className="flex-1 rounded-2xl bg-white text-slate-950 px-4 py-3 font-semibold disabled:opacity-50"
                            onClick={createNodeAndConnect}
                          >
                            {busy ? "Creando…" : "Crear y conectar"}
                          </button>
                          <button
                            disabled={busy}
                            className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3"
                            onClick={() => setLinkFrom(null)}
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
                {canPublish
                  ? "Listo para publicar ✅"
                  : "Para publicar: definí el nodo de inicio y asegurate de que no haya ciclos. Las ramas pueden terminar sin nodo FIN."}
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

