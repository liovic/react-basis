<p align="center">
  <img src="./assets/logo.png" width="300" alt="Basis Logo">
</p>

<div align="center">

# react-state-basis

### Runtime diagnostics for React state

**Basis observes when state updates happen and uses those patterns to highlight state-management issues that can be difficult to spot in a code review or profiler. It does not inspect state values.**

[![npm version](https://img.shields.io/npm/v/react-state-basis.svg?style=flat-square)](https://www.npmjs.com/package/react-state-basis)
[![GitHub stars](https://img.shields.io/github/stars/liovic/react-state-basis.svg?style=flat-square)](https://github.com/liovic/react-state-basis/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

</div>

---

## Quick Start

### 1. Install

```bash
npm i react-state-basis
```

### 2. Setup with Vite

Add the plugin to your `vite.config.ts`.

The Babel plugin labels React hooks automatically, so you can continue importing from `react` as usual.

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { basis } from 'react-state-basis/vite';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['react-state-basis/plugin']],
      },
    }),
    basis(),
  ],
});
```
This is the supported setup today. Next.js / SWC is not instrumented yet.

### 3. Initialize

```tsx
import { BasisProvider } from 'react-state-basis';

root.render(
  <BasisProvider
    debug={true}
    showHUD={true}
  >
    <App />
  </BasisProvider>
);
```

Set `showHUD={false}` to keep the diagnostics in the console without showing the overlay.

### 4. Try it

For example:

```tsx
const [a, setA] = useState(0);
const [b, setB] = useState(0);

useEffect(() => {
  setB(a + 1);
}, [a]);

return (
  <button onClick={() => setA(a + 1)}>
    Update
  </button>
);
```

When the button is clicked, Basis can identify the effect-driven update pattern and report where it originated. You should see in your console:

```
⚡ BASIS | DOUBLE RENDER
📍 Location: YourComponent.tsx
Issue: effect_L5 triggers b in a separate frame.
Fix: Derive b during the render phase (remove effect) or wrap in useMemo.
```

Detection happens at runtime and timing varies by pattern.

---

## HUD

The optional HUD shows state updates as they happen.

<p align="center">
  <img src="./assets/050Basis.gif" width="800" alt="Basis Demo">
</p>

The HUD is useful for seeing individual updates. The console report looks at the observed update graph over time, which can reveal patterns that are harder to see from a single interaction.

---

## What Basis Looks For

Basis does not try to determine whether your state is "correct." Instead, it looks for update patterns that are often worth investigating.

### Effect-driven updates

A `useEffect` causes another state update immediately after rendering.

This can be a sign that some state could be derived during render instead.

### Correlated state

Two pieces of state repeatedly update within the same time window.

For example:

```tsx
const [isLoading, setIsLoading] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
```

If these values consistently change together, it may be worth checking whether they could be represented by a single state value.

Basis reports the correlation; it does not assume that the states should be merged.

### Fragmented updates

A single interaction causes updates across multiple components, files, contexts, or stores.

Sometimes this is intentional. In other cases, it can indicate that state ownership is spread across several places.

### Context mirroring

Local state is repeatedly updated from Context state.

This can create two representations of the same information and is worth reviewing when the local copy does not have an independent purpose.

### Update origins

When several updates occur together, Basis can use the observed update graph to identify which updates appear upstream of others.

This is intended to help investigate a chain of updates rather than simply reporting every downstream symptom.

### Infinite update protection

Basis includes safeguards to stop its own instrumentation from continuing indefinitely when an application enters a recursive update loop.

---

### Important: these are signals, not proofs

Basis uses runtime timing and correlation heuristics.

A detected pattern is **not automatically a bug**, and Basis does not know the intent behind your application architecture.

Use the results as prompts for investigation rather than as rules for how React code should be written.

[See examples and possible fixes →](https://github.com/liovic/react-state-basis/wiki/The-Forensic-Catalog)

---

## Reports

Run:

```js
window.printBasisReport()
```

to print a summary of the observed update graph.

The report can include:

* **Update sources** - where observed update chains appear to originate.
* **Fan-out** - which updates are followed by the largest number of downstream updates.
* **Correlated state** - state variables that repeatedly update together.
* **Effect-driven updates** - updates that occur as a consequence of effects.
* **Engine metrics** - runtime measurements collected by the Basis engine.

These metrics are diagnostic rather than a score for the quality of your application.

### Runtime metrics

You can inspect engine metrics with:

```js
window.getBasisMetrics()
```

---

## Controlling the Instrumentation

### Console-only mode

Disable the HUD while keeping diagnostics enabled:

```tsx
<BasisProvider showHUD={false}>
  <App />
</BasisProvider>
```

### Ignoring files

Add:

```ts
// @basis-ignore
```

to a file to disable Basis instrumentation for that file.

This can be useful for:

* high-frequency animation code
* third-party library wrappers
* intentionally synchronized state
* code where instrumentation is not useful

---

## Integrations

### Zustand

Basis can observe Zustand store updates alongside React state.

```typescript
import { create } from 'zustand';
import { basisLogger } from 'react-state-basis/zustand';

export const useStore = create(
  basisLogger(
    (set) => ({
      theme: 'light',

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
    }),
    'MyStore'
  )
);
```

This allows React and Zustand updates to appear in the same runtime graph.

[See the Zustand example →](./examples/basis-zustand/)

### Planned integrations

XState, React Query, and Redux Toolkit are planned.

Community contributions are welcome.

---

## Performance & Privacy

Basis is designed primarily as a development-time diagnostic tool.

* **Development:** instrumentation overhead is designed to remain small; current benchmarks show less than 1ms per update cycle in tested scenarios.
* **Production:** monitoring is disabled, with a small production footprint.
* **Privacy:** Basis records update timing and relationships, not application state values.

Actual overhead depends on the application and instrumentation configuration.

[See benchmarks →](https://github.com/liovic/react-state-basis/wiki/Performance-Forensics)

---

## Real-World Examples

Basis has also been tested against existing open-source applications.

* **Excalidraw** - Basis identified a theme synchronization pattern and a possible simplification. [PR #10637](https://github.com/excalidraw/excalidraw/pull/10637) was proposed but not merged.
* **shadcn-admin** - Basis identified a redundant state pattern in viewport detection hooks. [PR #274](https://github.com/satnaing/shadcn-admin/pull/274) was merged.

These examples are intended as demonstrations of the tool's output, not as claims that every detected pattern represents a defect.

---

## How It Works

Basis observes the timing and relationships between state updates while your application runs.

It builds an in-memory representation of those updates and applies heuristics to identify recurring patterns.

It does **not** need to inspect the values stored in your state to perform these checks.

The analysis is intentionally heuristic. Runtime behavior can show that two things consistently happen together, but it cannot by itself prove why they happen together or whether the relationship is intentional.

For a deeper look at the implementation and underlying model:

[Read the documentation and theory →](https://github.com/liovic/react-state-basis/wiki)

---

## Roadmap

* ✓ **v0.4.x** - Identify state that repeatedly updates together
* ✓ **v0.5.x** - Identify local state synchronized from Context
* → **v0.6.x** - Analyze update fan-out and likely upstream sources
* **v0.7.x** - Improve detection of derived vs. independent state
* **v0.8.x** - Explore how much local state components actually use

[See the full roadmap →](https://github.com/liovic/react-state-basis/wiki/Roadmap)

---

<div align="center">

Built by [LP](https://github.com/liovic) • [MIT License](https://opensource.org/licenses/MIT)

</div>
