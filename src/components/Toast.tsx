import React from "react";

export function Toast({ toast }: { toast: { open: boolean; text: string } }) {
  return (
    <div
      className={
        "fixed left-1/2 -translate-x-1/2 bottom-5 z-[9999] " +
        "transition-all duration-300 " +
        (toast.open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none")
      }
    >
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-5 py-3 shadow-2xl backdrop-blur">
        <div className="text-sm font-semibold text-emerald-100 text-center">{toast.text}</div>
      </div>
    </div>
  );
}