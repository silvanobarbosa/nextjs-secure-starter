/**
 * #1 Empty state = a PRIMEIRA tela de onboarding (retenção). Regra 2026: todo
 * estado vazio explica "o que vai aqui · por que importa · a 1ª ação". Universal
 * — use em toda lista/tabela/dashboard vazio.
 */
export function EmptyState({
  icon = "✨",
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="empty" role="status">
      <span className="empty-i" aria-hidden>{icon}</span>
      <h2 className="empty-t">{title}</h2>
      <p className="empty-d">{description}</p>
      {actionLabel && actionHref && (
        <a className="empty-a" href={actionHref}>{actionLabel}</a>
      )}
    </div>
  );
}
