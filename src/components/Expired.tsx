import React from "react";
import { navigate } from "../lib/navigate";

export function Expired() {
  return (
    <div className="min-h-screen bg-[#0B0E1A] text-white p-8">
      <h1 className="text-2xl font-semibold">Esta invitación ya no está disponible</h1>
      <p className="text-white/70 mt-2">Pedile a la persona que te comparta un link nuevo.</p>
      <button className="mt-4 rounded-2xl bg-white text-[#0B0E1A] px-4 py-2" onClick={() => navigate("/")}>
        Volver
      </button>
    </div>
  );
}