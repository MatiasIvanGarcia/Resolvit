import React from "react";
import { navigate } from "../lib/navigate";
import { supabase } from "../lib/supabase";

function getParam(name: string) {
  try { return new URL(window.location.href).searchParams.get(name); } catch { return null; }
}

export function Login() {
  const [mode, setMode] = React.useState<"login" | "signup">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  function redirectAfterAuth() {
    const next = getParam("next") || "/create";
    const template = getParam("template");
    const url = template ? `${next}?template=${template}` : next;
    navigate(url);
  }

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
        else redirectAfterAuth();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setMsg(error.message);
        else redirectAfterAuth();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0E1A] text-white">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <button className="text-lg font-semibold" onClick={() => navigate("/")}>
          Resolvit
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
            className="w-full rounded-2xl bg-white text-[#0B0E1A] px-4 py-3 font-semibold disabled:opacity-50"
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