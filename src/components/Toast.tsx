"use client";
import { useEffect, useState } from "react";

/**
 * #4 Feedback (toast) sem dependência. `toast("Salvo!")` em qualquer lugar do
 * client; renderize <Toaster/> uma vez no layout. Bom feedback = confiança.
 */
type Kind = "success" | "error" | "info";
interface Msg { id: number; text: string; kind: Kind }

export function toast(text: string, kind: Kind = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("rl-toast", { detail: { text, kind } }));
}

export function Toaster() {
  const [items, setItems] = useState<Msg[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const { text, kind } = (e as CustomEvent<{ text: string; kind: Kind }>).detail;
      const id = ++n;
      setItems((v) => [...v, { id, text, kind }]);
      setTimeout(() => setItems((v) => v.filter((m) => m.id !== id)), 4000);
    };
    window.addEventListener("rl-toast", on);
    return () => window.removeEventListener("rl-toast", on);
  }, []);
  return (
    <div className="toaster" role="region" aria-live="polite" aria-label="Notificações">
      {items.map((m) => (
        <div key={m.id} className={`toast toast-${m.kind}`}>{m.text}</div>
      ))}
    </div>
  );
}
