"use client";
/**
 * #4 Error boundary (500) amigável — comunica + oferece ação (tentar de novo).
 * Boa UX sempre dá feedback: nunca uma tela branca ou stack trace pro usuário.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="shell">
      <div className="empty" role="alert">
        <span className="empty-i" aria-hidden>⚠️</span>
        <h2 className="empty-t">Algo deu errado</h2>
        <p className="empty-d">Já registramos o problema. Tente de novo — costuma resolver.</p>
        {error?.digest && <p className="empty-d" style={{ opacity: 0.5, fontSize: 12 }}>ref: {error.digest}</p>}
        <button className="empty-a" onClick={() => reset()}>Tentar de novo</button>
      </div>
    </main>
  );
}
