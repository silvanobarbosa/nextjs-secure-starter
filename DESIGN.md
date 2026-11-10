# DESIGN.md — design guidance (premium identity, not generic)

> O cérebro consulta isto ao montar telas. Objetivo: **design diferenciado** (pilar do negócio) — cada app com identidade própria, todos premium. Regra-mãe 2026: **os melhores não parecem feitos por IA.** Evite o genérico (card cinza + botão azul + sombra padrão).

## Fonte de identidade
- **Tokens vêm do gerador**: `node gen-design-system.mjs "<Nome>" [brandHex] [mood]` → cola o `:root` no `globals.css`. Cada app = hue/mood/tipo distintos. **Nunca** deixe o neon default do template.
- Sempre **dark-mode-first** (maturidade de marca → pricing power). Ofereça light como opção.

## Layout (padrões 2026 que impressionam)
- **Hero product-led**: título forte (font-display, -0.01em), subtítulo curto, 1 CTA primário, prova/screenshot. Sem "wall of text".
- **Bento grid**: contar features em blocos de tamanhos variados (não grid uniforme). Um bloco "hero" grande + menores.
- **Glassmorphism pontual**: só em 1-2 momentos (nav, card destaque) — `backdrop-filter: blur`. Não a página toda.
- **Espaço**: generoso. Respiro > densidade. Hierarquia por tamanho+peso+cor, não por caixas.
- **Data-viz**: quando houver números, mostre-os grandes (stat tiles) antes de tabelas.

## Tipografia
- Par **display + body** (do gerador). Display pra títulos (serif editorial OU grotesk forte), body legível (Inter/Geist/IBM Plex).
- Tamanhos: título 40-56px, seção 24-28px, corpo 15-16px. Line-height corpo 1.6.
- **Bold typography** é tendência: título pode ser pesado (700-900).

## Cor & profundidade
- Fundo dark tintado (não #000 puro) — o gerador já faz. Superfícies sobem em luminância.
- **Soft-glow** no acento (gradiente radial sutil atrás do hero) = toque humano, não flat-genérico.
- Contraste WCAG AA no texto (o gerador garante). Acento só em CTA/destaque, não em tudo.

## Motion — ESTRUTURAL, não decorativo
- Tokens: `--motion` (220ms) / `--motion-fast` (140ms) / `--ease` (cubic-bezier(.22,1,.36,1)).
- Use em: **entrada** (fade+translateY 8px), **hover** (translateY -2px + border acento), **transição de página**, **estados** (loading skeleton, sucesso). Micro, com significado.
- **Não**: parallax pesado, autoplay chamativo, animação que atrasa o LCP. "Minimal motion que adiciona sentido, não ruído."
- Respeite `prefers-reduced-motion`.

## Anti-genérico (o que evitar)
- ❌ Card cinza + sombra padrão + botão azul Bootstrap. ❌ Emoji como ícone principal em produto sério. ❌ Gradiente arco-íris. ❌ Tudo com o mesmo raio/sombra.
- ✅ 1 detalhe memorável por tela (um gradiente de marca, uma tipografia forte, um empty-state ilustrado). ✅ Consistência de tokens. ✅ Imperfeição/humanidade sutil.

## Checklist antes do deploy (o juiz de design cobra isto)
- [ ] Tokens do gerador aplicados (não o neon default)?
- [ ] Hierarquia clara (dá pra ler a tela em 3s)?
- [ ] 1 elemento memorável / identidade própria?
- [ ] Dark-mode-first + contraste AA?
- [ ] Motion estrutural + reduced-motion?
- [ ] Empty-states desenhados (não "sem dados")?
- [ ] Não parece template genérico de IA?
