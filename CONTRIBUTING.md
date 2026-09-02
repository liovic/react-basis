# Contributing to react-state-basis

Thank you for your interest in contributing to react-state-basis.

This project is a **deterministic runtime analysis engine**. Its primary goal is to reliably detect architectural issues in React applications based on how state behaves over time.

To maintain correctness and long-term stability, contributions follow a **two-track model**.

---

## Contribution Tracks

### 1. Core Engine (Invariant-driven analysis)

The core engine is responsible for all detection logic and guarantees.

**Non-negotiable properties of the engine:**
- Deterministic results (same input trace → same output, every run)
- Reproducible analysis - no reliance on randomness or wall-clock timing in the detection math itself
- Detection is heuristic by design (timing-correlation over a fixed window, compared against tuned thresholds) - that's not a bug to eliminate, it's the mechanism. What's non-negotiable is that any threshold or constant is documented with the reasoning/data behind it, not just handed down as a magic number.

Changes to the core engine must preserve these invariants.

#### Scope
Files typically considered part of the core engine include:
- `src/core.ts`
- `src/engine/.ts`
- Any logic that affects detection, comparison, or signal analysis

#### Expectations
Contributors working in this area are expected to:
- Understand the existing invariants before proposing changes
- Explain *why* a change preserves correctness
- Avoid “close enough” logic, thresholds without justification, or empirical tuning

If you are unsure whether a change belongs in the core engine, open an RFC issue first.

---

### 2. Ecosystem & Developer Experience

Contributions outside the core engine are **strongly encouraged** and do not require deep knowledge of the engine internals.

Examples include:
- Framework integrations (Next.js, Remix, Webpack, etc.)
- State library adapters (Zustand, Redux, Jotai)
- HUD and visualization improvements
- Tooling (CLI helpers, setup automation)
- Documentation and examples

These contributions must not alter core analysis behavior.

---

## Engineering Standards

### Zero-Overhead Principle
The engine must remain effectively invisible in production builds.

- No side effects outside development mode
- No leakage into production exports
- No runtime cost once disabled

### Determinism First
Auditing results must depend only on the recorded update trace, not on wall-clock timing, browser quirks, or execution order accidents outside that trace. The engine's *conclusions* (duplicate state, causal leak, etc.) are statistical inferences from that trace, not proofs - thresholds like SIMILARITY_THRESHOLD and CAUSAL_MARGIN should be justified in code comments or a linked doc when changed.

---

## Workflow

- **Target branch:** `dev`
  - Pull requests opened against `main` will be asked to retarget
- **RFC first:** Required for changes affecting detection logic or engine behavior
- **Atomic commits:** One pull request = one logical change
- **Ghost Mode verification:** Ensure no changes leak into `production.ts` zero-op exports

---

## Local Development

Developing a React library that intercepts core hooks requires strict management of React instances. If the library and the example app use different React binaries, the engine will fail to initialize (resulting in an empty HUD or "Invalid Hook Call" errors).

### The Recommended Workflow (Yalc)
We prefer **Yalc** over `npm link` because it avoids symlink-related resolution issues in Vite.

1.  **In the project root:**
    ```bash
    npm run build
    yalc publish
    ```
2.  **In the `example` folder:**
    ```bash
    yalc add react-state-basis
    npm install
    npm run dev
    ```

### Using npm link (The "Singleton Wedding")
If you prefer `npm link`, you must perform a "reverse link" to ensure the library and the app share the exact same React instance:

1.  **Register the library:** (In project root)
    ```bash
    npm link
    ```
2.  **Link to the app:** (In `example` folder)
    ```bash
    npm link react-state-basis
    ```
3.  **The Marriage Step:** Force the library to use the app's React (In project root):
    ```bash
    npm link ./example/node_modules/react
    npm link ./example/node_modules/react-dom
    ```

---

## Acknowledgements
Contributors who provide significant architectural insights or build core integrations will be featured in the **Technical Acknowledgements** section of the project.

— LP