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
            Creá invitaciones interactivas para armar planes en segundos.
          </h1>
          <p className="text-white/70 text-lg">
            Armás preguntas con dos opciones (con fotos) y el link permite que la otra persona elija.
            Con branching podés crear árboles de decisión (Día/Noche → Merienda/Cena, etc).
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className="rounded-2xl bg-white text-slate-950 px-5 py-3 text-sm font-semibold hover:opacity-90"
              onClick={() => navigate(session ? "/create" : "/login")}
            >
              {session ? "Crear mi primer plan" : "Empezar"}
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
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function sendLink() {
    setBusy(true);
    setError(null);

    const redirectTo = `${window.location.origin}/create`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setBusy(false);

    if (error) setError(error.message);
    else setSent(true);
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
          <h1 className="text-3xl font-semibold">Iniciar sesión</h1>
          <p className="text-white/70">
            Te mandamos un link por mail. Hacés click y entrás sin contraseña.
          </p>

          <input
            className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          {error && <div className="text-red-300 text-sm">{error}</div>}

          <button
            disabled={busy || !email}
            onClick={sendLink}
            className="w-full rounded-2xl bg-white text-slate-950 px-4 py-3 font-semibold disabled:opacity-50"
          >
            {busy ? "Enviando…" : "Enviar magic link"}
          </button>

          {sent && (
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-white/80 text-sm">
              Listo ✅ Revisá tu mail y hacé click en el link para entrar.
            </div>
          )}

          <button className="w-full text-white/70 text-sm underline" onClick={() => navigate("/")}>
            Volver
          </button>
        </div>
      </main>
    </div>
  );
}


function Create({ session }: { session: Session }) {
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

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-white/15 bg-white/5 p-6">
          Builder /create (siguiente paso): wizard para crear preguntas + branching.
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

  if (path === "/login") return <Login />;

  if (path === "/create") {
    if (!session) {
      navigate("/login");
      return null;
    }
    return <Create session={session} />;
  }

  if (path === "/expired") return <Expired />;

  return <Home session={session} />;
}

