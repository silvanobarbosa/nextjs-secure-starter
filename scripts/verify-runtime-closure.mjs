#!/usr/bin/env node
// verify-runtime-closure — invariante: código de RUNTIME (prod) não importa devDependency.
// Adaptado da disciplina verify-* do deepseek-harness (via Reed). Um devDep vazado no bundle
// de produção incha/quebra o deploy. O hub/fleet já cobre isso via dependency-cruiser (warn);
// aqui no template é GATE (o app nasce limpo). Node puro, sem deps.
//
// Escopo: só arquivos de runtime em src/ (exclui teste/config/stories/e2e). Ignora `import type`
// (apagado no build). Uso: node scripts/verify-runtime-closure.mjs [--strict] [dir]
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, relative, extname } from "node:path";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const root = resolve(args.find((a) => !a.startsWith("--")) || ".");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const deps = new Set(Object.keys(pkg.dependencies || {}));
const devDeps = new Set(Object.keys(pkg.devDependencies || {}));
// devDep que NÃO está também em dependencies = proibido no runtime
const forbidden = new Set([...devDeps].filter((d) => !deps.has(d)));

const RUNTIME_DIRS = ["src", "app", "lib"].map((d) => join(root, d)).filter(existsSync);
const CODE = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const EXCLUDE = /(\.test\.|\.spec\.|\.stories\.|\.config\.|[\\/](__tests__|e2e|tests?)[\\/])/i;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (CODE.has(extname(e.name)) && !EXCLUDE.test(p)) out.push(p);
  }
  return out;
}

// nome do pacote a partir do especificador do import ('@scope/x/sub' -> '@scope/x')
function pkgName(spec) {
  if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("node:")) return null;
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

// import/require ESTÁTICO, ignorando `import type ...` (só-tipo, apagado no build)
const IMPORT = /(?:^|\n)\s*import\s+(?!type\s)[^;]*?from\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g;

const violations = [];
const files = RUNTIME_DIRS.flatMap((d) => walk(d));
for (const f of files) {
  const src = readFileSync(f, "utf8");
  let m;
  IMPORT.lastIndex = 0;
  while ((m = IMPORT.exec(src)) !== null) {
    const name = pkgName(m[1] || m[2] || m[3] || "");
    if (name && forbidden.has(name)) {
      const line = src.slice(0, m.index).split("\n").length;
      violations.push({ file: relative(root, f), line, pkg: name });
    }
  }
}

console.log(`verify-runtime-closure: ${files.length} arquivos de runtime, ${violations.length} import(s) de devDependency.`);
for (const v of violations) {
  const msg = `${v.file}:${v.line} importa devDependency '${v.pkg}' (código de prod não deve puxar devDep)`;
  console.log(strict ? `  ✗ ${msg}` : `::warning file=${v.file},line=${v.line}::runtime-closure: devDep '${v.pkg}' no runtime`);
}
if (violations.length && strict) process.exit(1);
