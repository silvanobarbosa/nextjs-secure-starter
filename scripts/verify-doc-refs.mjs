#!/usr/bin/env node
// verify-doc-refs — gate leve de consistência doc↔código (adaptado da disciplina verify-* do
// deepseek-harness; ver Reed). Varre os .md do repo e confere que TODO link de arquivo relativo
// aponta pra um caminho que EXISTE. Pega doc que drifta quando o código é movido/renomeado —
// exatamente o "se nomeia um arquivo, confirme que ainda existe".
//
// Não é scanner de segurança (isso é a CI-QA); é invariante de documentação. Sem deps.
// Uso:  node scripts/verify-doc-refs.mjs [--strict] [dir]
//   default = report-mode (exit 0, imprime ::warning::). --strict = exit 1 se houver quebrado.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const root = resolve(args.find((a) => !a.startsWith("--")) || ".");

const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage", ".turbo", "out"]);
// alvos que NÃO são caminho de arquivo (URLs, âncoras, protocolos, templates)
const SKIP = /^(https?:|mailto:|tel:|#|<|\{|\$)/i;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") && e.name !== ".github") continue;
    if (IGNORE_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.toLowerCase().endsWith(".md")) out.push(p);
  }
  return out;
}

// caminho existe (arquivo OU diretório)?
const hits = (p) => { try { statSync(p); return true; } catch { return false; } };

// resolve o alvo do link: relativo ao .md OU à raiz do repo. Ignora âncora/linha (#L10).
function targetExists(mdFile, raw) {
  let t = raw.split(/\s+/)[0].replace(/[)>]+$/, "").trim(); // tira título/lixo
  t = t.split("#")[0]; // âncora / #L12-L20
  if (!t || SKIP.test(t)) return true; // não é caminho de arquivo → ok
  try { t = decodeURIComponent(t); } catch { /* mantém */ }
  const rel = existsSync(resolve(dirname(mdFile), t)) && hits(resolve(dirname(mdFile), t));
  const fromRoot = existsSync(resolve(root, t.replace(/^\.?\//, ""))) && hits(resolve(root, t.replace(/^\.?\//, "")));
  return rel || fromRoot;
}

const LINK = /\[[^\]]*\]\(([^)]+)\)/g; // [texto](alvo)
const broken = [];
const files = walk(root);

for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    let m;
    LINK.lastIndex = 0;
    while ((m = LINK.exec(line)) !== null) {
      if (!targetExists(f, m[1])) broken.push({ file: relative(root, f), line: i + 1, target: m[1].split(/\s+/)[0] });
    }
  });
}

console.log(`verify-doc-refs: ${files.length} .md varridos, ${broken.length} referência(s) quebrada(s).`);
for (const b of broken) {
  const msg = `${b.file}:${b.line} → aponta pra '${b.target}' que não existe`;
  console.log(strict ? `  ✗ ${msg}` : `::warning file=${b.file},line=${b.line}::doc-ref quebrada: ${b.target}`);
}
if (broken.length && strict) process.exit(1);
