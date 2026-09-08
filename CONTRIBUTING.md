# Contributing to react-state-basis

Thanks for wanting to help.

Basis watches *when* React state updates, then flags patterns that are often worth a second look. Detection is a heuristic, not a proof. The goal is to stay honest about that and keep results stable enough that people can trust a report.

You do not need to understand the engine to be useful here. Docs, examples, integrations, and HUD work are just as welcome.

---

## Two kinds of changes

### Engine / detection

This is the sensitive part: `src/engine.ts`, `src/core/analysis.ts`, `src/core/math.ts`, `src/core/constants.ts`, and anything else that decides whether two traces count as a hit.

Same recorded trace should produce the same result. No randomness and no wall-clock in the detection math.

The hit rule lives in `isSignificantOverlap()` (`src/core/math.ts`). Cosine is display-only - do not put a similarity cutoff back on the detect path. The numeric defaults are `PAIR_RARITY_TARGET` and `RELATIVE_OVERLAP_FLOOR` in `src/core/constants.ts`. If those turn out wrong, change the constant and say why.

If you want to change detection behavior, an issue or a short RFC first is helpful.

### Everything else

Integrations, adapters, HUD, tooling, docs, examples - please jump in. These should not quietly change what the engine reports.

---

## A few things we care about

**Production stays quiet.** Development-only behavior should not leak into production exports or add cost when debug is off.

**One rule in one place.** If you change how “significant overlap” is decided, change it in `isSignificantOverlap`, not in a second copy in the logger.

**Small PRs.** One idea per pull request is easier to review and easier to revert.

Target branch is `dev`. PRs against `main` will just get a polite “please retarget.”

---

## Local development

Hook interception is picky about React instances. If the library and the demo app resolve different copies of React, you get an empty HUD or “Invalid Hook Call.”

### Yalc (preferred)

From the repo root:

```bash
npm run build
yalc publish
```

In `examples/basis-react`:

```bash
yalc add react-state-basis
npm install
npm run dev
```

### npm link

From the repo root:

```bash
npm link
```

In `examples/basis-react`:

```bash
npm link react-state-basis
```

Then, from the repo root, point the library at the app’s React:

```bash
npm link ./examples/basis-react/node_modules/react
npm link ./examples/basis-react/node_modules/react-dom
```

---

Questions are fine. If something in the engine is unclear, ask - the comments are supposed to explain the “why,” and if they do not, that is on us.

— LP