import React from "react";
import { motion } from "framer-motion";
import { navigate } from "../lib/navigate";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";

const SEASONS = [
  { label: "San Valentín", emoji: "\u2764\uFE0F", month: 2, day: 14, color: "from-rose-500/20 to-pink-600/20", border: "border-rose-400/30" },
  { label: "Día del Padre", emoji: "\uD83C\uDF93", month: 6, day: 15, color: "from-amber-500/20 to-orange-600/20", border: "border-amber-400/30" },
  { label: "Mundial 2026", emoji: "\u26BD", month: 6, day: 11, color: "from-emerald-500/20 to-teal-600/20", border: "border-emerald-400/30" },
  { label: "Navidad", emoji: "\uD83C\uDF84", month: 12, day: 25, color: "from-red-500/20 to-green-600/20", border: "border-red-400/30" },
  { label: "Año Nuevo", emoji: "\uD83C\uDF89", month: 12, day: 31, color: "from-violet-500/20 to-indigo-600/20", border: "border-violet-400/30" },
  { label: "Cumpleaños", emoji: "\uD83C\uDF82", month: 0, day: 0, color: "from-cyan-500/20 to-blue-600/20", border: "border-cyan-400/30" },
];

function getUpcomingSeasons(): typeof SEASONS {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const sorted = SEASONS.map((s) => {
    if (s.month === 0) return { ...s, daysAway: 999 };
    let target = new Date(now.getFullYear(), s.month - 1, s.day);
    if (target < now) {
      target = new Date(now.getFullYear() + 1, s.month - 1, s.day);
    }
    const daysAway = Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { ...s, daysAway };
  }).sort((a, b) => a.daysAway - b.daysAway);

  return sorted.slice(0, 4);
}

function NodesAnimation() {
  const nodes = [
    { x: 20, y: 30, delay: 0 },
    { x: 50, y: 15, delay: 0.3 },
    { x: 80, y: 35, delay: 0.6 },
    { x: 35, y: 60, delay: 0.2 },
    { x: 65, y: 55, delay: 0.5 },
    { x: 45, y: 80, delay: 0.4 },
  ];

  const edges = [
    [0, 1],
    [1, 2],
    [0, 3],
    [1, 4],
    [3, 4],
    [3, 5],
    [4, 5],
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        {edges.map(([from, to], i) => {
          const a = nodes[from];
          const b = nodes[to];
          return (
            <motion.line
              key={`e-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="url(#lineGrad)"
              strokeWidth="0.3"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.4 }}
              transition={{ duration: 1.5, delay: 0.5 + i * 0.15, ease: "easeOut" }}
            />
          );
        })}
        {nodes.map((node, i) => (
          <motion.circle
            key={`n-${i}`}
            cx={node.x}
            cy={node.y}
            r="1.8"
            fill="white"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.7 }}
            transition={{ duration: 0.6, delay: node.delay + 0.3, ease: "easeOut" }}
          />
        ))}
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function Home({ session }: { session: Session | null }) {
  const upcomingSeasons = React.useMemo(() => getUpcomingSeasons(), []);

  return (
    <div className="min-h-screen bg-[#0B0E1A] text-white">
      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-violet-500 flex items-center justify-center text-sm font-bold text-[#0B0E1A]">
            R
          </div>
          <span className="text-lg font-bold tracking-tight">Resolvit</span>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <button
                className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15 transition-colors"
                onClick={() => navigate("/plans")}
              >
                Mis planes
              </button>
              <button
                className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15 transition-colors"
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
              className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15 transition-colors"
              onClick={() => navigate("/login")}
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto max-w-6xl px-6 pt-12 pb-20 md:pt-20 md:pb-28 relative">
          <NodesAnimation />

          <div className="relative z-10 max-w-2xl">
            <motion.h1
              className="text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Tus opciones,{" "}
              <span className="bg-gradient-to-r from-teal-400 to-violet-400 bg-clip-text text-transparent">
                tu plan
              </span>
              , una decisión final.
            </motion.h1>

            <motion.p
              className="mt-5 text-lg text-white/60 max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              Creá invitaciones interactivas donde cada persona elige su camino y recibe un mensaje personalizado.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-3 pt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <button
                className="rounded-xl bg-gradient-to-r from-teal-500 to-violet-500 px-6 py-3 text-sm font-semibold hover:from-teal-400 hover:to-violet-400 transition-all shadow-lg shadow-teal-500/20"
                onClick={() => navigate(session ? "/create" : "/login")}
              >
                Crear plan
              </button>
              <button
                className="rounded-xl bg-white/10 border border-white/10 px-6 py-3 text-sm hover:bg-white/15 transition-colors"
                onClick={() => navigate("/invite/ABC123")}
              >
                Ver demo
              </button>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Plantillas de temporada</h2>
            <p className="text-white/50 mb-8">Elegí una plantilla y personalizada en minutos.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {upcomingSeasons.map((season) => (
                <button
                  key={season.label}
                  className={`group rounded-2xl border ${season.border} bg-gradient-to-br ${season.color} p-5 text-left hover:scale-[1.02] transition-transform`}
                  onClick={() => navigate(session ? "/create" : "/login")}
                >
                  <div className="text-3xl mb-3">{season.emoji}</div>
                  <div className="font-semibold">{season.label}</div>
                  <div className="text-sm text-white/50 mt-1">
                    {season.month === 0 ? "Siempre disponible" : "Próximamente"}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-8">¿Cómo funciona?</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Creás el plan",
                  desc: "Definí las preguntas con múltiples opciones. Cada camino lleva a un mensaje diferente.",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-teal-400">
                      <path d="M12 4v16m8-8H4" strokeLinecap="round" />
                    </svg>
                  ),
                },
                {
                  step: "02",
                  title: "Compartís el link",
                  desc: "Enviá el link a quien quieras. Cada persona recorre las opciones y elige su camino.",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-violet-400">
                      <path d="M7.5 7.5L12 3l4.5 4.5M12 3v12m-8 4h16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
                {
                  step: "03",
                  title: "Deciden juntos",
                  desc: "Cada respuesta genera un mensaje personalizado. El resultado es único para cada persona.",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-amber-400">
                      <path d="M21 8a5 5 0 00-9.5-1M3 16a5 5 0 019.5 1m0-10v10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <div className="text-xs font-mono text-white/30 mb-1">{item.step}</div>
                      <div className="font-semibold text-lg">{item.title}</div>
                      <div className="text-white/50 text-sm mt-2 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
          <motion.div
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8 md:p-12 text-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold">Empezá ahora</h2>
            <p className="text-white/50 mt-3 max-w-md mx-auto">
              Creá un plan en segundos y compartilo. Sin registro obligatorio para responder.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                className="rounded-xl bg-gradient-to-r from-teal-500 to-violet-500 px-6 py-3 text-sm font-semibold hover:from-teal-400 hover:to-violet-400 transition-all shadow-lg shadow-teal-500/20"
                onClick={() => navigate(session ? "/create" : "/login")}
              >
                Crear plan
              </button>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-6">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-teal-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-[#0B0E1A]">
              R
            </div>
            Resolvit
          </div>
          <div className="text-white/30 text-sm">resolvit.app</div>
        </div>
      </footer>
    </div>
  );
}