export default function Home() {
  return (
    <main className="shell">
      <div className="card">
        <span className="badge">golden template</span>
        <h1>Acme Starter</h1>
        <p>
          Base determinística pronta: auth/RBAC, headers+CSP, CI-QA, testes e design.
          Substitua esta tela pela lógica do app.
        </p>
        <div className="row">
          <a className="pill" href="/api/health">/api/health</a>
          <a className="pill" href="/api/conformity">/api/conformity</a>
        </div>
      </div>
    </main>
  );
}
