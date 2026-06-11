import React from "react";
import { navigate } from "../lib/navigate";
import { supabase } from "../lib/supabase";
import { authedFetch } from "../lib/authedFetch";
import { useToast } from "../hooks/useToast";
import { Toast } from "./Toast";
import type { PlanItem } from "../lib/types";

export function MyPlans({ session }: { session: { access_token: string } }) {
  const token = session.access_token;

  const [plans, setPlans] = React.useState<PlanItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast, showToast } = useToast();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await authedFetch("/api/private/plans", token, { method: "GET" });
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
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0B0E1A] text-white">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <button className="text-lg font-semibold" onClick={() => navigate("/")}>
          Resolvit
        </button>

        <div className="flex items-center gap-2">
          <button
            className="rounded-2xl bg-white text-[#0B0E1A] px-4 py-2 text-sm font-semibold hover:opacity-90"
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
            <div className="text-white/60 text-sm">Tus planes guardados.</div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-10 text-white/70">Cargando...</div>
        ) : plans.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-white/15 bg-white/5 p-6 text-white/70">
            Todavía no tenés planes. Creá uno desde "Crear plan".
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((p) => {
              const share = p.invite?.share_url ? `${window.location.origin}${p.invite.share_url}` : null;

              return (
                <div
                  key={p.id}
                  className="group relative h-[200px] rounded-3xl overflow-hidden border border-white/15 bg-white/5 shadow-2xl"
                >
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

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

                  <div className="absolute right-4 top-4">
                    <div
                      title={(p as any).has_responses ? "Con respuestas" : "Sin respuestas"}
                      className={
                        "h-3 w-3 rounded-full ring-2 ring-white/20 " +
                        ((p as any).has_responses ? "bg-emerald-400" : "bg-yellow-400")
                      }
                    />
                  </div>

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

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity space-y-2">
                      <div className="flex gap-2">
                        {(p as any).has_responses && (
                          <button
                            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20"
                            onClick={() => navigate(`/results/${encodeURIComponent(p.id)}`)}
                          >
                            Respuestas
                          </button>
                        )}

                        <button
                          className="rounded-2xl bg-white text-[#0B0E1A] px-3 py-2 text-xs font-semibold hover:opacity-90"
                          onClick={() => navigate(`/create?plan=${encodeURIComponent(p.id)}`)}
                        >
                          Editar
                        </button>

                        {share ? (
                          <button
                            className="rounded-2xl bg-white/10 border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/15"
                            onClick={async () => {
                              await navigator.clipboard.writeText(share);
                              showToast("Link copiado correctamente");
                            }}
                          >
                            Link
                          </button>
                        ) : (
                          <button
                            disabled
                            className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs font-semibold text-white/40 cursor-not-allowed"
                            title="No publicado todavía"
                          >
                            Link
                          </button>
                        )}

                        <button
                          className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                          onClick={async () => {
                            if (!confirm("¿Eliminar este plan y todo lo relacionado?")) return;
                            try {
                              await authedFetch(`/api/private/plan/${encodeURIComponent(p.id)}`, token, {
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Toast toast={toast} />
    </div>
  );
}