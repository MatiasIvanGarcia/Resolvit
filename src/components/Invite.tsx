import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EMPTY } from "../lib/supabase";
import { navigate } from "../lib/navigate";
import { OptionCard } from "./OptionCard";
import type { PublicPlan } from "../lib/types";

const fadeSlide = {
  initial: { opacity: 0, y: 16, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(6px)" },
};

type Question = { id: string; ord: number; title: string; subtitle: string | null; options: Array<{ id: string; ord: number; label: string; image_url: string | null; next_question_id: string | null }> };

export function Invite() {
  const code = window.location.pathname.split("/").pop() || "";
  const [plan, setPlan] = React.useState<PublicPlan | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [currentQuestionId, setCurrentQuestionId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<{ invitation_text?: string } | null>(null);
  const [voterName, setVoterName] = React.useState("");
  const [nameReady, setNameReady] = React.useState(false);
  const [visitedCount, setVisitedCount] = React.useState(0);

  const questionMap = React.useMemo(() => {
    if (!plan || plan.status !== "ok") return new Map<string, Question>();
    const map = new Map<string, Question>();
    for (const q of plan.questions) {
      map.set(q.id, q);
    }
    return map;
  }, [plan]);

  const orderedQuestions = React.useMemo(() => {
    if (!plan || plan.status !== "ok") return [] as Question[];
    return plan.questions.slice().sort((a: Question, b: Question) => a.ord - b.ord);
  }, [plan]);

  const currentQuestion = currentQuestionId ? questionMap.get(currentQuestionId) ?? null : null;

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

  React.useEffect(() => {
    if (!plan || plan.status !== "ok") return;
    const startId = plan.plan.start_question_id || (orderedQuestions.length > 0 ? orderedQuestions[0].id : null);
    setCurrentQuestionId(startId);
  }, [plan, orderedQuestions]);

  React.useEffect(() => {
    const key = `resolvit:voterName:${code}`;
    const saved = localStorage.getItem(key) || "";
    if (saved.trim()) {
      setVoterName(saved);
      setNameReady(true);
    } else {
      setNameReady(false);
    }
  }, [code]);

  React.useEffect(() => {
    const key = `resolvit:voterName:${code}`;
    if (voterName.trim()) localStorage.setItem(key, voterName.trim());
  }, [voterName, code]);

  function restart() {
    const startId = plan && plan.status === "ok"
      ? (plan.plan.start_question_id || (orderedQuestions.length > 0 ? orderedQuestions[0].id : null))
      : null;
    setCurrentQuestionId(startId);
    setBusy(false);
    setAnswers({});
    setResult(null);
    setVisitedCount(0);
  }

  async function finalize(finalAnswers: Record<string, string>) {
    try {
      const res = await fetch(`/api/public/submit/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          answers: finalAnswers,
          voter_name: voterName.trim(),
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        setResult({
          invitation_text: `Error HTTP ${res.status}\n\n` + (data ? JSON.stringify(data, null, 2) : ""),
        });
        return;
      }

      if (!data || data.status !== "ok" || typeof data.invitation_text !== "string") {
        setResult({
          invitation_text: "No se pudo generar el mensaje final.\n\n" + JSON.stringify(data, null, 2),
        });
        return;
      }

      setResult(data);
    } catch (e: any) {
      setResult({
        invitation_text: "Error de red.\n\n" + String(e?.message || e),
      });
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0B0E1A] text-white p-8">Cargando...</div>;
  }

  if (!plan || plan.status !== "ok") {
    navigate("/expired");
    return null;
  }

  if (!nameReady) {
    const bgUrl = (plan.plan as any).background_image_url ?? null;

    return (
      <div className="min-h-screen text-white relative overflow-hidden">
        {bgUrl ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-[#0B0E1A]" />
        )}

        <div className="absolute inset-0 bg-[#0B0E1A]/70" />

        <div className="relative flex items-center justify-center min-h-screen px-5">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/5 p-6 shadow-2xl">
            <div className="text-2xl font-semibold mb-2">Antes de empezar</div>

            <div className="text-white/70 mb-4">Ingresá tu nombre para registrar tu voto.</div>

            <input
              autoFocus
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
            />

            <button
              disabled={!voterName.trim()}
              onClick={() => setNameReady(true)}
              className="mt-4 w-full rounded-2xl bg-white text-[#0B0E1A] px-4 py-3 font-semibold disabled:opacity-50"
            >
              Comenzar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = currentQuestion;
  const done = q === null && visitedCount > 0;
  const bgUrl = (plan.plan as any).background_image_url ?? null;

  async function pick(optionId: string) {
    if (busy || !q) return;
    setBusy(true);

    const nextAnswers = { ...answers, [q.id]: optionId };
    setAnswers(nextAnswers);

    const selectedOption = q.options.find((o: { id: string }) => o.id === optionId);
    const nextQId = selectedOption?.next_question_id ?? null;

    window.setTimeout(async () => {
      setVisitedCount((c) => c + 1);

      if (nextQId) {
        setCurrentQuestionId(nextQId);
        setBusy(false);
      } else {
        setCurrentQuestionId(null);
        await finalize(nextAnswers);
        setBusy(false);
      }
    }, 220);
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
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
        <div className="absolute inset-0 bg-[#0B0E1A]" />
      )}

      <div className="absolute inset-0 bg-[#0B0E1A]/55" />

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
                      Pregunta {visitedCount + 1}
                    </div>
                  </div>

                  {(() => {
                    const sortedOpts = q.options
                      .slice()
                      .sort((a: { ord: number }, b: { ord: number }) => a.ord - b.ord);
                    const isCompact = sortedOpts.length > 2;
                    const gridCols = sortedOpts.length <= 2
                      ? "grid-cols-1 md:grid-cols-2"
                      : sortedOpts.length <= 4
                        ? "grid-cols-2 md:grid-cols-2"
                        : "grid-cols-2 md:grid-cols-3";
                    return (
                      <div className={`grid ${gridCols} gap-4`}>
                        {sortedOpts.map((o: { id: string; ord: number; label: string; image_url: string | null }) => (
                          <OptionCard
                            key={o.id}
                            label={o.label === EMPTY ? "" : o.label || ""}
                            imageUrl={o.image_url}
                            disabled={busy}
                            onPick={() => pick(o.id)}
                            compact={isCompact}
                          />
                        ))}
                      </div>
                    );
                  })()}
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
                      {(result?.invitation_text ?? "Generando...").replace(/\\n/g, "\n")}
                    </pre>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {voterName.trim() && (
        <div className="fixed bottom-5 right-6 px-3 py-1 rounded-full bg-black/30 border border-white/15 text-white/90 text-sm font-semibold backdrop-blur">
          {voterName.trim()}
        </div>
      )}
    </div>
  );
}