import { EmptyState } from "@/components/EmptyState";

// #4 404 útil (não um beco sem saída) — diz o que houve + caminho de volta.
export default function NotFound() {
  return (
    <main className="shell">
      <EmptyState
        icon="🧭"
        title="Página não encontrada"
        description="O link pode ter mudado ou expirado. Vamos te levar de volta ao início."
        actionLabel="Voltar ao início"
        actionHref="/"
      />
    </main>
  );
}
