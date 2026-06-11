import React from "react";
import { navigate } from "../lib/navigate";
import { authedFetch } from "../lib/authedFetch";
import { EMPTY } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { Toast } from "./Toast";
import type { PlanRow, QuestionRow, OptionRow } from "../lib/types";

function getQueryParam(name: string) {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  } catch {
    return null;
  }
}

export function CreateLinear({ session }: { session: { access_token: string } }) {
  const token = session.access_token;

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [plan, setPlan] = React.useState<PlanRow | null>(null);

  const [title, setTitle] = React.useState("");
  const [personName, setPersonName] = React.useState("");
  const [bgUrl, setBgUrl] = React.useState("");

  const editingPlanId = React.useMemo(() => getQueryParam("plan"), []);
  const isEditing = Boolean(editingPlanId);

  const [questions, setQuestions] = React.useState<QuestionRow[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = React.useState<Record<string, OptionRow[]>>({});
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);

  const { toast, showToast } = useToast();

  const DEFAULT_TITLE_TMPL = "Te invito #persona a que pasemos #plan juntos";
  const DEFAULT_BODY_TMPL = "Hola #persona!!\n\n¿Te copás a #decision1?\n\nTe espero!!";

  const [inviteTitleTmpl, setInviteTitleTmpl] = React.useState(DEFAULT_TITLE_TMPL);
  const [inviteBodyTmpl, setInviteBodyTmpl] = React.useState(DEFAULT_BODY_TMPL);
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);

  const titleRef = React.useRef<HTMLInputElement | null>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null);

  const sortedQuestions = React.useMemo(
    () => questions.slice().sort((a, b) => a.ord - b.ord),
    [questions]
  );

  function getOpts(qid: string) {
    return (optionsByQuestion[qid] || []).slice().sort((a, b) => a.ord - b.ord);
  }

  function isComplete(q: QuestionRow) {
    const opts = getOpts(q.id);
    return Boolean(q.subtitle?.trim()) && opts.length === 2 && opts.every((o) => (o.label || "").trim().length > 0);
  }

  const canPublish = Boolean(plan?.id) && sortedQuestions.length > 0 && sortedQuestions.every(isComplete);

  function variablesList() {
    const vars = ["#plan", "#persona"];
    sortedQuestions.forEach((_, i) => vars.push(`#decision${i + 1}`));
    return vars;
  }

  async function loadPlanForEdit(planId: string) {
    setBusy(true);
    setError(null);
    try {
      const data = await authedFetch(`/api/private/plan/${encodeURIComponent(planId)}/full`, token, { method: "GET" });

      if (data?.status !== "ok") throw new Error(JSON.stringify(data));

      const p = data.plan as PlanRow & {
        background_image_url?: string | null;
        invite_title_template?: string | null;
        invite_body_template?: string | null;
      };

      setPlan({ id: p.id, title: p.title, person_name: p.person_name ?? null, status: p.status });

      setTitle(p.title ?? "");
      setPersonName(p.person_name ?? "");
      setBgUrl(p.background_image_url ?? "");

      const qs: QuestionRow[] = data.questions ?? [];
      const opts: OptionRow[] = data.options ?? [];

      setQuestions(qs);

      const grouped: Record<string, OptionRow[]> = {};
      for (const o of opts) {
        (grouped[o.question_id] ||= []).push(o);
      }
      setOptionsByQuestion(grouped);

      setShareUrl(data.share_url ?? null);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  function insertAtCursor(target: "title" | "body", tokenStr: string) {
    if (target === "title") {
      const el = titleRef.current;
      if (!el) return;
      const start = el.selectionStart ?? inviteTitleTmpl.length;
      const end = el.selectionEnd ?? inviteTitleTmpl.length;
      const next = inviteTitleTmpl.slice(0, start) + tokenStr + inviteTitleTmpl.slice(end);
      setInviteTitleTmpl(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + tokenStr.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      const el = bodyRef.current;
      if (!el) return;
      const start = el.selectionStart ?? inviteBodyTmpl.length;
      const end = el.selectionEnd ?? inviteBodyTmpl.length;
      const next = inviteBodyTmpl.slice(0, start) + tokenStr + inviteBodyTmpl.slice(end);
      setInviteBodyTmpl(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + tokenStr.length;
        el.setSelectionRange(pos, pos);
      });
    }
  }

  async function patchPlan(patch: Partial<PlanRow>) {
    if (!plan?.id) return;
    setError(null);
    try {
      const updated = await authedFetch(`/api/private/plan/${encodeURIComponent(plan.id)}`, token, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setPlan((prev) => (prev ? { ...prev, ...updated } : prev));
      if (typeof updated?.title === "string") setTitle(updated.title);
      if ("person_name" in (updated || {})) setPersonName(updated.person_name ?? "");
      if ("background_image_url" in (updated || {})) setBgUrl(updated.background_image_url ?? "");
    } catch (e: any) {
      setError(String(e.message || e));
    }
  }

  React.useEffect(() => {
    if (!isEditing || !editingPlanId) return;

    (async () => {
      try {
        setBusy(true);
        setError(null);

        const data = await authedFetch(`/api/private/plan/${encodeURIComponent(editingPlanId)}/builder`, token, {
          method: "GET",
        });

        if (data.status !== "ok") throw new Error(JSON.stringify(data));

        const p = data.plan as PlanRow;
        const qs = (data.questions || []) as QuestionRow[];
        const os = (data.options || []) as OptionRow[];

        setPlan(p);
        setBgUrl(p.background_image_url ?? "");

        setInviteTitleTmpl(p.invite_title_template ?? DEFAULT_TITLE_TMPL);
        setInviteBodyTmpl(p.invite_body_template ?? DEFAULT_BODY_TMPL);

        setQuestions(qs);

        const map: Record<string, OptionRow[]> = {};
        for (const o of os) {
          (map[o.question_id] ||= []).push(o);
        }
        setOptionsByQuestion(map);

        setShareUrl(null);
      } catch (e: any) {
        setError(String(e.message || e));
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editingPlanId]);

  React.useEffect(() => {
    if (editingPlanId) {
      loadPlanForEdit(editingPlanId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPlanId]);

  async function saveTemplates() {
    if (!plan?.id) return;
    setSavingTemplate(true);
    setError(null);
    try {
      const out = await authedFetch(`/api/private/plan/${encodeURIComponent(plan.id)}/templates`, token, {
        method: "PATCH",
        body: JSON.stringify({
          invite_title_template: inviteTitleTmpl,
          invite_body_template: inviteBodyTmpl,
        }),
      });

      if (out?.plan) {
        setPlan((p) => (p ? { ...p, ...out.plan } : p));
      } else {
        setPlan((p) =>
          p
            ? { ...p, invite_title_template: inviteTitleTmpl, invite_body_template: inviteBodyTmpl }
            : p
        );
      }

      setSaveMsg("Guardado ✅");
      window.setTimeout(() => setSaveMsg(null), 1200);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setSavingTemplate(false);
    }
  }

  async function createPlan() {
    setError(null);
    setBusy(true);
    try {
      const data = await authedFetch("/api/private/plan", token, {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), person_name: personName.trim() || null }),
      });
      setPlan(data);
      setBgUrl(data.background_image_url ?? "");
      setQuestions([]);
      setOptionsByQuestion({});
      setShareUrl(null);

      setInviteTitleTmpl(DEFAULT_TITLE_TMPL);
      setInviteBodyTmpl(DEFAULT_BODY_TMPL);

      await authedFetch(`/api/private/plan/${encodeURIComponent(data.id)}/templates`, token, {
        method: "PATCH",
        body: JSON.stringify({
          invite_title_template: DEFAULT_TITLE_TMPL,
          invite_body_template: DEFAULT_BODY_TMPL,
        }),
      });
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

      const newQ: QuestionRow = await authedFetch("/api/private/question", token, {
        method: "POST",
        body: JSON.stringify({
          plan_id: plan.id,
          ord: nextOrd,
          title: "¿Qué preferís?",
          subtitle: "",
        }),
      });

      const newOpts: OptionRow[] = await authedFetch("/api/private/options2", token, {
        method: "POST",
        body: JSON.stringify({
          question_id: newQ.id,
          a: { label: "", image_url: null },
          b: { label: "", image_url: null },
        }),
      });

      const prevQ = questions
        .slice()
        .sort((a, b) => a.ord - b.ord)
        .find((q) => q.ord === nextOrd - 1);

      if (prevQ) {
        const prevOpts = (optionsByQuestion[prevQ.id] || [])
          .slice()
          .sort((a, b) => a.ord - b.ord);
        const o1 = prevOpts[0];
        const o2 = prevOpts[1];

        if (o1?.id && o2?.id) {
          await Promise.all([
            authedFetch(`/api/private/option/${encodeURIComponent(o1.id)}`, token, {
              method: "PATCH",
              body: JSON.stringify({ next_question_id: newQ.id }),
            }),
            authedFetch(`/api/private/option/${encodeURIComponent(o2.id)}`, token, {
              method: "PATCH",
              body: JSON.stringify({ next_question_id: newQ.id }),
            }),
          ]);

          setOptionsByQuestion((prev) => ({
            ...prev,
            [prevQ.id]: prevOpts.map((o) =>
              o.id === o1.id || o.id === o2.id ? { ...o, next_question_id: newQ.id } : o
            ),
          }));
        }
      }

      setQuestions((prev) => [...prev, newQ]);
      setOptionsByQuestion((prev) => ({ ...prev, [newQ.id]: newOpts }));
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function patchQuestion(qid: string, patch: Partial<QuestionRow>) {
    setError(null);
    try {
      const updated = await authedFetch(`/api/private/question/${encodeURIComponent(qid)}`, token, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setQuestions((prev) => prev.map((q) => (q.id === qid ? { ...q, ...updated } : q)));
    } catch (e: any) {
      setError(String(e.message || e));
    }
  }

  async function deleteDecision(qid: string) {
    if (!confirm("¿Eliminar esta decisión?")) return;
    setBusy(true);
    setError(null);
    try {
      await authedFetch(`/api/private/question/${encodeURIComponent(qid)}`, token, { method: "DELETE" });

      setQuestions((prev) => prev.filter((q) => q.id !== qid));
      setOptionsByQuestion((prev) => {
        const copy = { ...prev };
        delete copy[qid];
        return copy;
      });
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function patchOption(qid: string, oid: string, patch: Partial<OptionRow>) {
    setError(null);
    try {
      const updated = await authedFetch(`/api/private/option/${encodeURIComponent(oid)}`, token, {
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

  async function publish(expiresHours: number | null) {
    if (!plan?.id) return;
    setBusy(true);
    setError(null);
    try {
      await saveTemplates();

      const data = await authedFetch(`/api/private/plan/${encodeURIComponent(plan.id)}/publish`, token, {
        method: "PATCH",
        body: JSON.stringify({ expires_in_hours: expiresHours }),
      });
      setShareUrl(data.share_url || null);
      setPlan((p) => (p ? { ...p, status: "published" } : p));
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0E1A] text-white">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="text-lg font-semibold" onClick={() => navigate("/")}>
            Resolvit
          </button>
        </div>

        <button
          className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-sm hover:bg-white/15"
          onClick={() => navigate("/plans")}
        >
          Mis planes
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 whitespace-pre-wrap">
            {error}
          </div>
        )}

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
                className="md:col-span-3 rounded-2xl bg-white text-[#0B0E1A] px-4 py-3 font-semibold disabled:opacity-50"
                onClick={createPlan}
              >
                {busy ? "Creando..." : "Crear plan"}
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <div className="text-xs text-white/60 mb-1">Título</div>
                <input
                  className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                  value={plan.title}
                  onChange={(e) => setPlan((p) => (p ? { ...p, title: e.target.value } : p))}
                  onBlur={() => patchPlan({ title: plan.title.trim() })}
                  placeholder="San Valentín"
                />
              </div>

              <div className="md:col-span-1">
                <div className="text-xs text-white/60 mb-1">Para</div>
                <input
                  className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                  value={plan.person_name ?? ""}
                  onChange={(e) => setPlan((p) => (p ? { ...p, person_name: e.target.value } : p))}
                  onBlur={() => patchPlan({ person_name: (plan.person_name ?? "").trim() || null })}
                  placeholder="Sofía"
                />
              </div>

              <div className="md:col-span-1">
                <div className="text-xs text-white/60 mb-1">URL Imagen de fondo (opcional)</div>
                <input
                  className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                  value={bgUrl}
                  onChange={(e) => setBgUrl(e.target.value)}
                  onBlur={() => patchPlan({ background_image_url: bgUrl.trim() || null })}
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-3 text-xs text-white/60">
                estado: <span className="text-white/80">{plan.status}</span>
              </div>
            </div>
          )}
        </div>

        {plan && (
          <div className="mt-6 space-y-4">
            {sortedQuestions.map((q, idx) => {
              const [o1, o2] = getOpts(q.id);
              const complete = isComplete(q);

              return (
                <div key={q.id} className="rounded-3xl border border-white/15 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">#{idx + 1} decisión</div>

                    <div className="flex items-center gap-2">
                      <div
                        className={
                          "text-xs px-2 py-1 rounded-full border " +
                          (complete
                            ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10"
                            : "border-yellow-400/30 text-yellow-200 bg-yellow-500/10")
                        }
                      >
                        {complete ? "Completa" : "Incompleta"}
                      </div>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deleteDecision(q.id)}
                        title="Eliminar"
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        Eliminar
                      </button>
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
                        onBlur={() => o1 && patchOption(q.id, o1.id, { label: o1.label ?? "" } as any)}
                        placeholder="Escribí la opción izquierda..."
                      />
                      <input
                        className="mt-2 w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                        value={o1?.image_url ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOptionsByQuestion((prev) => ({
                            ...prev,
                            [q.id]: (prev[q.id] || []).map((o) =>
                              o.id === o1?.id ? { ...o, image_url: v || null } : o
                            ),
                          }));
                        }}
                        onBlur={() => o1 && patchOption(q.id, o1.id, { image_url: o1.image_url ?? null } as any)}
                        placeholder="URL imagen (opcional)"
                      />
                    </div>

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
                        onBlur={() => o2 && patchOption(q.id, o2.id, { label: o2.label ?? "" } as any)}
                        placeholder="Escribí la opción derecha..."
                      />
                      <input
                        className="mt-2 w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                        value={o2?.image_url ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOptionsByQuestion((prev) => ({
                            ...prev,
                            [q.id]: (prev[q.id] || []).map((o) =>
                              o.id === o2?.id ? { ...o, image_url: v || null } : o
                            ),
                          }));
                        }}
                        onBlur={() => o2 && patchOption(q.id, o2.id, { image_url: o2.image_url ?? null } as any)}
                        placeholder="URL imagen (opcional)"
                      />
                    </div>
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

            <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
              <div className="text-sm font-semibold">Mensaje final</div>

              <div className="mt-3 text-xs text-white/60">
                Variables disponibles:
                <span className="ml-2">#persona</span>
                <span className="ml-2">#plan</span>
                {sortedQuestions.map((_, i) => (
                  <span key={i} className="ml-2">#decision{i + 1}</span>
                ))}
              </div>

              <div className="mt-3">
                <div className="text-xs text-white/60 mb-1">Título</div>
                <input
                  ref={titleRef}
                  className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none"
                  value={inviteTitleTmpl}
                  onChange={(e) => setInviteTitleTmpl(e.target.value)}
                />
              </div>

              <div className="mt-3">
                <div className="text-xs text-white/60 mb-1">Cuerpo</div>
                <textarea
                  ref={bodyRef}
                  rows={8}
                  className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 outline-none resize-none"
                  value={inviteBodyTmpl}
                  onChange={(e) => setInviteBodyTmpl(e.target.value)}
                />
              </div>

              <button
                disabled={savingTemplate}
                onClick={saveTemplates}
                className="mt-4 rounded-2xl bg-white text-[#0B0E1A] px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {savingTemplate ? "Guardando..." : "Guardar mensaje"}
              </button>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
              <div className="text-sm font-semibold">Publicar</div>
              <div className="mt-2 text-sm text-white/70">
                {canPublish ? "Listo para publicar ✅" : "Completá todas las preguntas y las 2 opciones en cada decisión."}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  disabled={busy || !canPublish}
                  className="rounded-2xl bg-white text-[#0B0E1A] px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  onClick={() => publish(null)}
                >
                  Publicar
                </button>
              </div>

              {shareUrl && (
                <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-3">
                  <div className="text-xs text-white/60">Link</div>
                  <div className="mt-1 font-mono text-sm break-all">
                    {window.location.origin}
                    {shareUrl}
                  </div>
                  <button
                    className="mt-3 rounded-2xl bg-white text-[#0B0E1A] px-4 py-2 text-sm font-semibold"
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
                      showToast("Link copiado correctamente");
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

      <Toast toast={toast} />
    </div>
  );
}