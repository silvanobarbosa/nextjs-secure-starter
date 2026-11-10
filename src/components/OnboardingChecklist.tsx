"use client";
/**
 * #1 Checklist de ativação (opt-in — apps de produto). Guia o usuário ao 1º valor
 * em <10min (time-to-value). Onboarding estruturado = +50% retenção. Marque cada
 * passo como `done` conforme o usuário avança (persistência fica a cargo do app).
 */
export interface Step { id: string; label: string; href?: string; done: boolean }

export function OnboardingChecklist({ steps, title = "Comece por aqui" }: { steps: Step[]; title?: string }) {
  const done = steps.filter((s) => s.done).length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
  return (
    <aside className="onb" aria-label="Passos de ativação">
      <div className="onb-head">
        <strong>{title}</strong>
        <span className="onb-pct">{done}/{steps.length}</span>
      </div>
      <div className="onb-bar"><span style={{ width: `${pct}%` }} /></div>
      <ul className="onb-list">
        {steps.map((s) => (
          <li key={s.id} className={s.done ? "onb-done" : ""}>
            <span aria-hidden>{s.done ? "✅" : "⬜"}</span>
            {s.href && !s.done ? <a href={s.href}>{s.label}</a> : <span>{s.label}</span>}
          </li>
        ))}
      </ul>
    </aside>
  );
}
