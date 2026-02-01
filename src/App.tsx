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

function CreateLinear({ session }: { session: Session }) {
  type PlanRow = { id: string; title: string; person_name: string | null; status: string };
  type QuestionRow = { id: string; plan_id: string; ord: number; title: string; subtitle: string | null };
  type OptionRow = { id: string; question_id: string; ord: number; label: string; image_url: string | null; next_question_id: string | null };

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
  const [title, setTitle] = React.useState("");
  const [personName, setPersonName] = React.useState("");

  const [questions, setQuestions] = React.useState<QuestionRow[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = React.useState<Record<string, OptionRow[]>>({});
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);

  const sortedQuestions = React.useMemo(() => questions.slice().sort((a, b) => a.ord - b.ord), [questions]);

  function getOpts(qid: string) {
    return (optionsByQuestion[qid] || []).slice().sort((a, b) => a.ord - b.ord);
  }

  function isComplete(q: QuestionRow) {
    const opts = getOpts(q.id);
    return Boolean(q.subtitle?.trim()) && opts.length === 2 && opts.every((o) => o.label.trim().length > 0);
  }

  const canPublish = plan?.id && sortedQuestions.length > 0 && sortedQuestions.every(isComplete);

  async function createPlan() {
    setError(null);
    setBusy(true);
    try {
      const data = await authedFetch("/api/private/plan", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), person_name: personName.trim() || null }),
      });
      setPlan(data);
      setQuestions([]);
      setOptionsByQuestion({});
      setShareUrl(null);
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

  async function moveQuestion(qid: string, dir: -1 | 1) {
    const list = sortedQuestions;
    const idx = list.findIndex((q) => q.id === qid);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;

    // swap ord local + persist (PATCH question ord)
    const a = list[idx];
    const b = list[j];

    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === a.id) return { ...q, ord: b.ord };
        if (q.id === b.id) return { ...q, ord: a.ord };
        return q;
      })
    );

    // persist best-effort
    await patchQuestion(a.id, { ord: b.ord } as any);
    await patchQuestion(b.id, { ord: a.ord } as any);
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
            <div className="mt-2 text-sm text-white/70">
              {plan.title}{plan.person_name ? ` · para ${plan.person_name}` : ""} · estado:{" "}
              <span className="text-white">{plan.status}</span>
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
                    <div className={"text-xs px-2 py-1 rounded-full border " + (complete ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10" : "border-yellow-400/30 text-yellow-200 bg-yellow-500/10")}>
                      {complete ? "Completa" : "Incompleta"}
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
                        onBlur={() => o1 && patchOption(q.id, o1.id, { label: o1.label } as any)}
                        placeholder="Ej: Día"
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
                        onBlur={() => o1 && patchOption(q.id, o1.id, { image_url: o1.image_url } as any)}
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
                        onBlur={() => o2 && patchOption(q.id, o2.id, { label: o2.label } as any)}
                        placeholder="Ej: Noche"
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
                        onBlur={() => o2 && patchOption(q.id, o2.id, { image_url: o2.image_url } as any)}
                        placeholder="URL imagen (opcional)"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
                      disabled={busy}
                      onClick={() => moveQuestion(q.id, -1)}
                    >
                      Subir
                    </button>
                    <button
                      className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
                      disabled={busy}
                      onClick={() => moveQuestion(q.id, +1)}
                    >
                      Bajar
                    </button>
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
    return <CreateLinear session={session} />;
  }

  return <Home session={session} />;
}

