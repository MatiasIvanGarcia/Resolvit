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


function Create({ session }: { session: Session }) {
  // -------- helpers ----------
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
      const msg = (data && (data.detail || data.error || data.message)) ? JSON.stringify(data) : "Request failed";
      throw new Error(msg);
    }
    return data;
  }

  // -------- state ----------
  type Step = "meta" | "q" | "branch" | "publish";
  const [resolvedOptionIds, setResolvedOptionIds] = React.useState<Record<string, boolean>>({});
  
  function nextPendingOption(opts: Array<{ id: string; label: string }>, resolved: Record<string, boolean>) {
    return opts.find((o) => !resolved[o.id]) ?? null;
  }

  const [step, setStep] = React.useState<Step>("meta");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [planId, setPlanId] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState("");
  const [personName, setPersonName] = React.useState("");

  // Current question being edited/created
  const [questionId, setQuestionId] = React.useState<string | null>(null);
  const [qSubtitle, setQSubtitle] = React.useState(""); // usamos subtitle como “Día o Noche…”
  const [qTitle, setQTitle] = React.useState("¿Qué preferís?");

  // Options (2)
  const [optA, setOptA] = React.useState({ label: "", image_url: "" });
  const [optB, setOptB] = React.useState({ label: "", image_url: "" });

  // Saved options from API
  const [savedOptions, setSavedOptions] = React.useState<
    Array<{ id: string; ord: number; label: string; image_url: string | null; next_question_id: string | null }>
  >([]);

  // Queue of “edges” to resolve: for each option, define what comes next
  const [pendingEdge, setPendingEdge] = React.useState<null | { optionId: string; optionLabel: string }>(null);

  // Local tree for preview (simple)
  const [nodes, setNodes] = React.useState<Array<{ id: string; subtitle: string; ord: number }>>([]);
  const [edges, setEdges] = React.useState<Array<{ fromQuestionId: string; optionLabel: string; toQuestionId: string | null }>>([]);

  const [nextOrd, setNextOrd] = React.useState(1); // ord de questions (incremental simple)

  const [shareUrl, setShareUrl] = React.useState<string | null>(null);

  function resetWizard() {
    setStep("meta");
    setBusy(false);
    setError(null);
    setPlanId(null);
    setQuestionId(null);
    setTitle("");
    setPersonName("");
    setQSubtitle("");
    setQTitle("¿Qué preferís?");
    setOptA({ label: "", image_url: "" });
    setOptB({ label: "", image_url: "" });
    setSavedOptions([]);
    setPendingEdge(null);
    setNodes([]);
    setEdges([]);
    setNextOrd(1);
    setShareUrl(null);
  }

  // -------- actions ----------
  async function createPlan() {
    setError(null);
    setBusy(true);
    try {
      const data = await authedFetch("/api/private/plan", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), person_name: personName.trim() || null }),
      });
      setPlanId(data.id);
      setNextOrd(1);
      setStep("q");
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function createQuestionAndOptions() {
    if (!planId) return;
    setError(null);
    setBusy(true);
    try {
      const ord = nextOrd;

      // 1) create question
      const q = await authedFetch("/api/private/question", {
        method: "POST",
        body: JSON.stringify({
          plan_id: planId,
          ord,
          title: qTitle.trim() || "¿Qué preferís?",
          subtitle: qSubtitle.trim() || null,
        }),
      });

      setQuestionId(q.id);
      setNodes((prev) => [...prev, { id: q.id, subtitle: q.subtitle || "", ord }]);

      // 2) create two options
      const opts = await authedFetch("/api/private/options2", {
        method: "POST",
        body: JSON.stringify({
          question_id: q.id,
          a: { label: optA.label.trim(), image_url: optA.image_url.trim() || null },
          b: { label: optB.label.trim(), image_url: optB.image_url.trim() || null },
        }),
      });

      // opts es array de 2
      setSavedOptions(opts);

      // 3) arrancamos resolución de branching con la opción ord=1
      setResolvedOptionIds({});
      const first = nextPendingOption(opts, {});
      setPendingEdge(first ? { optionId: first.id, optionLabel: first.label } : null);

      setStep("branch");
      setNextOrd((x) => x + 1);

      // limpiar form de próxima pregunta (por si crean otra)
      setQSubtitle("");
      setOptA({ label: "", image_url: "" });
      setOptB({ label: "", image_url: "" });
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

async function setOptionNext(optionId: string, nextQuestionId: string | null, optionLabel: string) {
  if (!questionId) return;
  setError(null);
  setBusy(true);
  try {
    await authedFetch(`/api/private/option/${encodeURIComponent(optionId)}`, {
      method: "PATCH",
      body: JSON.stringify({ next_question_id: nextQuestionId }),
    });

    // guardar edge local para preview
    setEdges((prev) => [
      ...prev,
      { fromQuestionId: questionId, optionLabel, toQuestionId: nextQuestionId },
    ]);

    // ✅ marcar resuelta
    setResolvedOptionIds((prev) => {
      const updated = { ...prev, [optionId]: true };

      // elegir la próxima pendiente de ESTA pregunta
      const nxt = nextPendingOption(savedOptions as any, updated);

      if (nxt) {
        setPendingEdge({ optionId: nxt.id, optionLabel: nxt.label });
        setStep("branch");
      } else {
        setPendingEdge(null);
        setStep("publish");
      }

      return updated;
    });
  } catch (e: any) {
    setError(String(e.message || e));
  } finally {
    setBusy(false);
  }
}

  async function createNextQuestionForPendingEdge() {
    // Creamos una nueva pregunta (ord = nextOrd actual) y linkeamos la opción pendiente hacia esa pregunta
    if (!planId || !pendingEdge) return;

    // Creamos la pregunta+opciones usando el form actual, y luego hacemos PATCH de la opción pendiente
    setError(null);
    setBusy(true);
    try {
      const ord = nextOrd;

      const q = await authedFetch("/api/private/question", {
        method: "POST",
        body: JSON.stringify({
          plan_id: planId,
          ord,
          title: qTitle.trim() || "¿Qué preferís?",
          subtitle: qSubtitle.trim() || null,
        }),
      });

      // Linkear option -> new question
      await authedFetch(`/api/private/option/${encodeURIComponent(pendingEdge.optionId)}`, {
        method: "PATCH",
        body: JSON.stringify({ next_question_id: q.id }),
      });

      // guardar edge local
      if (questionId) {
        setEdges((prev) => [
          ...prev,
          { fromQuestionId: questionId, optionLabel: pendingEdge.optionLabel, toQuestionId: q.id },
        ]);
      }

      // actualizar preview nodes
      setNodes((prev) => [...prev, { id: q.id, subtitle: q.subtitle || "", ord }]);

      // ahora la pregunta actual pasa a ser esta nueva, y hay que resolver sus dos opciones
      setQuestionId(q.id);

      const opts = await authedFetch("/api/private/options2", {
        method: "POST",
        body: JSON.stringify({
          question_id: q.id,
          a: { label: optA.label.trim(), image_url: optA.image_url.trim() || null },
          b: { label: optB.label.trim(), image_url: optB.image_url.trim() || null },
        }),
      });

      setSavedOptions(opts);

      // próximo pending edge: opción ord=1 de la nueva pregunta
      const first = opts.find((o: any) => o.ord === 1) || opts[0];
      setPendingEdge({ optionId: first.id, optionLabel: first.label });

      setNextOrd((x) => x + 1);

      // limpiar para próxima
      setQSubtitle("");
      setOptA({ label: "", image_url: "" });
      setOptB({ label: "", image_url: "" });

      setStep("branch");
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function publish(expiresHours: number | null) {
    if (!planId) return;
    setError(null);
    setBusy(true);
    try {
      const data = await authedFetch(`/api/private/plan/${encodeURIComponent(planId)}/publish`, {
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

  // -------- UI ----------
  const canMeta = title.trim().length > 0;
  const canQuestion =
    qSubtitle.trim().length > 0 &&
    optA.label.trim().length > 0 &&
    optB.label.trim().length > 0;

  function TreePreview() {
    // preview simple: lista de nodos + edges
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return (
      <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
        <div className="text-sm text-white/70">Vista árbol (preview)</div>
        <div className="mt-3 space-y-2 text-sm">
          {nodes
            .slice()
            .sort((a, b) => a.ord - b.ord)
            .map((n) => {
              const out = edges.filter((e) => e.fromQuestionId === n.id);
              return (
                <div key={n.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="font-semibold">Q{n.ord}: {n.subtitle || "(sin subtítulo)"}</div>
                  <div className="mt-2 space-y-1 text-white/80">
                    {out.length === 0 ? (
                      <div className="text-white/50">Sin conexiones aún</div>
                    ) : (
                      out.map((e, idx) => (
                        <div key={idx}>
                          • {e.optionLabel} →{" "}
                          {e.toQuestionId ? `Q${byId.get(e.toQuestionId)?.ord ?? "?"}` : "Finaliza"}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
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

      <main className="mx-auto max-w-6xl px-6 pb-14">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="rounded-3xl border border-white/15 bg-white/5 p-6">
              <div className="text-xs tracking-widest text-white/60">CREAR PLAN</div>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {/* Step indicator */}
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className={"px-3 py-1 rounded-full border " + (step === "meta" ? "border-white/40 bg-white/10" : "border-white/10 text-white/60")}>
                  1) Datos
                </span>
                <span className={"px-3 py-1 rounded-full border " + (step === "q" ? "border-white/40 bg-white/10" : "border-white/10 text-white/60")}>
                  2) Pregunta
                </span>
                <span className={"px-3 py-1 rounded-full border " + (step === "branch" ? "border-white/40 bg-white/10" : "border-white/10 text-white/60")}>
                  3) Branching
                </span>
                <span className={"px-3 py-1 rounded-full border " + (step === "publish" ? "border-white/40 bg-white/10" : "border-white/10 text-white/60")}>
                  4) Publicar
                </span>
              </div>

              {/* Step: meta */}
              {step === "meta" && (
                <div className="mt-6 space-y-4">
                  <div>
                    <div className="text-sm text-white/70">Título del plan</div>
                    <input
                      className="mt-2 w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej: Salida sorpresa"
                    />
                  </div>

                  <div>
                    <div className="text-sm text-white/70">Nombre de la persona (opcional)</div>
                    <input
                      className="mt-2 w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="Ej: Sofi"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      disabled={!canMeta || busy}
                      className="rounded-2xl bg-white text-slate-950 px-5 py-3 text-sm font-semibold disabled:opacity-50"
                      onClick={createPlan}
                    >
                      {busy ? "Creando…" : "Crear plan"}
                    </button>
                    <button
                      className="rounded-2xl bg-white/10 border border-white/15 px-5 py-3 text-sm hover:bg-white/15"
                      onClick={resetWizard}
                      disabled={busy}
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              )}

              {/* Step: question */}
              {step === "q" && (
                <div className="mt-6 space-y-4">
                  <div className="text-sm text-white/70">
                    Pregunta #{nextOrd} (2 opciones). En tu UI pública se muestra el subtítulo como “Día o Noche”.
                  </div>

                  <div>
                    <div className="text-sm text-white/70">Título (arriba grande)</div>
                    <input
                      className="mt-2 w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                      value={qTitle}
                      onChange={(e) => setQTitle(e.target.value)}
                      placeholder="¿Qué preferís?"
                    />
                  </div>

                  <div>
                    <div className="text-sm text-white/70">Subtítulo (la consigna)</div>
                    <input
                      className="mt-2 w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                      value={qSubtitle}
                      onChange={(e) => setQSubtitle(e.target.value)}
                      placeholder="Ej: Día o Noche"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
                      <div className="font-semibold">Opción A</div>
                      <input
                        className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                        value={optA.label}
                        onChange={(e) => setOptA((p) => ({ ...p, label: e.target.value }))}
                        placeholder="Ej: Día"
                      />
                      <input
                        className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                        value={optA.image_url}
                        onChange={(e) => setOptA((p) => ({ ...p, image_url: e.target.value }))}
                        placeholder="URL de imagen (opcional)"
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
                      <div className="font-semibold">Opción B</div>
                      <input
                        className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                        value={optB.label}
                        onChange={(e) => setOptB((p) => ({ ...p, label: e.target.value }))}
                        placeholder="Ej: Noche"
                      />
                      <input
                        className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                        value={optB.image_url}
                        onChange={(e) => setOptB((p) => ({ ...p, image_url: e.target.value }))}
                        placeholder="URL de imagen (opcional)"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      disabled={!canQuestion || busy}
                      className="rounded-2xl bg-white text-slate-950 px-5 py-3 text-sm font-semibold disabled:opacity-50"
                      onClick={createQuestionAndOptions}
                    >
                      {busy ? "Guardando…" : "Guardar pregunta"}
                    </button>

                    <button
                      className="rounded-2xl bg-white/10 border border-white/15 px-5 py-3 text-sm hover:bg-white/15"
                      onClick={() => navigate("/")}
                      disabled={busy}
                    >
                      Salir
                    </button>
                  </div>
                </div>
              )}

              {/* Step: branching */}
              {step === "branch" && (
                <div className="mt-6 space-y-4">
                  <div className="text-sm text-white/70">
                    Definí qué pasa si eligen esta opción:
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">Opción actual</div>
                    <div className="text-2xl font-semibold mt-1">{pendingEdge?.optionLabel || "—"}</div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      disabled={busy || !pendingEdge}
                      className="rounded-2xl bg-white text-slate-950 px-5 py-3 text-sm font-semibold disabled:opacity-50"
                      onClick={() => {
                        if (!pendingEdge) return;
                        setOptionNext(pendingEdge.optionId, null, pendingEdge.optionLabel);
                      }}
                    >
                      Finaliza
                    </button>

                    <button
                      disabled={busy || !pendingEdge}
                      className="rounded-2xl bg-white/10 border border-white/15 px-5 py-3 text-sm hover:bg-white/15 disabled:opacity-50"
                      onClick={() => setStep("q")}
                    >
                      Crear nueva pregunta
                    </button>
                  </div>

                  <div className="text-xs text-white/50">
                    Si tocás “Crear nueva pregunta”, completás la pregunta siguiente y automáticamente se conecta a esta opción.
                  </div>
                </div>
              )}

              {/* Step: publish */}
              {step === "publish" && (
                <div className="mt-6 space-y-4">
                  <div className="text-sm text-white/70">
                    Ya definiste las 2 opciones de la última pregunta creada. Podés publicar y obtener el link.
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      disabled={busy || !planId}
                      className="rounded-2xl bg-white text-slate-950 px-5 py-3 text-sm font-semibold disabled:opacity-50"
                      onClick={() => publish(null)}
                    >
                      {busy ? "Publicando…" : "Publicar (sin expiración)"}
                    </button>
                    <button
                      disabled={busy || !planId}
                      className="rounded-2xl bg-white/10 border border-white/15 px-5 py-3 text-sm hover:bg-white/15 disabled:opacity-50"
                      onClick={() => publish(24)}
                    >
                      Publicar (expira en 24h)
                    </button>
                  </div>

                  {shareUrl && (
                    <div className="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-2">
                      <div className="text-sm text-white/80">Link para compartir</div>
                      <div className="font-mono text-white">{window.location.origin}{shareUrl}</div>
                      <button
                        className="rounded-2xl bg-white text-slate-950 px-4 py-2 text-sm hover:opacity-90"
                        onClick={async () => {
                          await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
                          alert("Copiado ✅");
                        }}
                      >
                        Copiar link
                      </button>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap gap-3">
                    <button
                      className="rounded-2xl bg-white/10 border border-white/15 px-5 py-3 text-sm hover:bg-white/15"
                      onClick={resetWizard}
                      disabled={busy}
                    >
                      Crear otro plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:w-[360px]">
            <TreePreview />

            {/* Acción especial: cuando estamos en branching y el usuario eligió crear nueva pregunta,
               volvemos a step=q, pero necesitamos linkear option->newQuestion al guardar.
               Para eso, si step cambia a q desde branch, usamos createNextQuestionForPendingEdge en vez de createQuestionAndOptions.
            */}
            {step === "q" && pendingEdge && (
              <div className="mt-4 rounded-3xl border border-white/15 bg-white/5 p-5">
                <div className="text-sm text-white/70">Conexión pendiente</div>
                <div className="mt-2 text-white">
                  Esta nueva pregunta se conectará desde: <span className="font-semibold">{pendingEdge.optionLabel}</span>
                </div>

                <button
                  disabled={!canQuestion || busy}
                  className="mt-4 w-full rounded-2xl bg-white text-slate-950 px-5 py-3 text-sm font-semibold disabled:opacity-50"
                  onClick={createNextQuestionForPendingEdge}
                >
                  {busy ? "Guardando…" : "Guardar y conectar"}
                </button>

                <div className="mt-2 text-xs text-white/50">
                  (Esto crea la pregunta+opciones y hace el PATCH de next_question_id automáticamente.)
                </div>
              </div>
            )}
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
    return <Create session={session} />;
  }

  return <Home session={session} />;
}

