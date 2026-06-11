import React from "react";
import { navigate } from "../lib/navigate";
import { authedFetch } from "../lib/authedFetch";

export function PlanResults({ session }: { session: { access_token: string } }) {
  const token = session.access_token;
  const planId = window.location.pathname.split("/").pop() || "";
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [plan, setPlan] = React.useState<any>(null);
  const [stats, setStats] = React.useState<any>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await authedFetch(`/api/private/plan/${encodeURIComponent(planId)}/stats`, token, {
          method: "GET",
        });

        if (cancelled) return;
        setPlan(data.plan);
        setStats(data.stats);
      } catch (e: any) {
        if (!cancelled) setError(String(e.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [planId, token]);

  const bgUrl = plan?.background_image_url ?? null;

  if (loading) {
    return <div className="min-h-screen bg-[#0B0E1A] text-white p-8">Cargando...</div>;
  }

  if (error || !plan || !stats) {
    return (
      <div className="min-h-screen bg-[#0B0E1A] text-white p-8">
        <div className="text-2xl font-semibold">No se pudo cargar el resultado</div>
        <pre className="mt-4 text-white/70 whitespace-pre-wrap">{error || "error"}</pre>
        <button
          className="mt-6 rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
          onClick={() => navigate("/plans")}
        >
          Volver a Mis planes
        </button>
      </div>
    );
  }

  const total = Number(stats?.total_responses || 0);
  const questions = Array.isArray(stats?.questions) ? stats.questions : [];

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

      <div className="absolute inset-0 bg-[#0B0E1A]/60" />

      <div className="relative">
        <div className="mx-auto max-w-6xl px-5 py-7 md:py-10">
          <header className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs tracking-widest text-white/60">INVITACIÓN</div>
              <div className="text-lg md:text-xl font-semibold">
                {plan.person_name ? `Plan para ${plan.person_name}` : plan.title}
              </div>

              <div className="mt-5 text-4xl md:text-5xl font-semibold leading-tight">
                Resultado
              </div>

              <div className="mt-2 text-white/70 text-sm">
                Respuestas registradas: <span className="text-white font-semibold">{total}</span>
              </div>
            </div>

            <button
              className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
              onClick={() => navigate("/plans")}
            >
              Mis planes
            </button>
          </header>

          <main className="mt-8">
            <div className="rounded-3xl border border-white/15 bg-white/5 p-5 md:p-7">
              {total === 0 ? (
                <div className="text-white/80">
                  Todavía no hay respuestas. Compartí el link del plan y volvé más tarde 😄
                </div>
              ) : (
                <div className="space-y-8">
                  {questions.map((q: any) => {
                    const opts = Array.isArray(q.options) ? q.options : [];
                    return (
                      <div key={q.question_id} className="space-y-3">
                        <div className="text-sm text-white/60">#{q.ord} decisión</div>

                        <div className="text-xl md:text-2xl font-semibold">
                          {q.subtitle?.trim() ? q.subtitle : q.title || "Decisión"}
                        </div>

                        <div className="mt-3 space-y-3">
                          {opts.map((o: any) => {
                            const pct = Number(o.pct || 0);
                            const votes = Number(o.votes || 0);
                            return (
                              <div key={o.option_id} className="space-y-2">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="text-white/90">{o.label || "—"}</div>
                                  <div className="text-white/70 text-sm">
                                    {votes} · {pct}%
                                  </div>
                                </div>

                                <div className="h-3 rounded-full bg-black/30 border border-white/10 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-white/70"
                                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}