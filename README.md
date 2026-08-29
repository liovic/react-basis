<p align="center">
  <img src="./assets/logo.png" width="300" alt="Basis Logo">
</p>

<div align="center">

# react-state-basis
### Runtime Architectural Auditor for React

**Basis tracks when state updates (never what) to catch architectural debt that standard tools miss, while keeping your data private.**

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

### 2. Setup (Vite)
Add the plugin to your `vite.config.ts`. The Babel plugin auto-labels your hooks - you continue importing from `react` as normal.

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { basis } from 'react-state-basis/vite';

export default defineConfig({
  plugins: [
    react({ 
      babel: { plugins: [['react-state-basis/plugin']] } 
    }),
    basis()
  ]
});
```

### 3. Initialize
```tsx
import { BasisProvider } from 'react-state-basis';

root.render(
  <BasisProvider 
    debug={true}
    showHUD={true} // Set to false for console-only forensics
  >
    <App />
  </BasisProvider>
);
```

### 4. Verify the Signal
Drop this pattern into any component. For this pattern, Basis typically flags the rhythm of the debt within ~100ms; detection latency can vary for other patterns.

```tsx
const [a, setA] = useState(0);
const [b, setB] = useState(0);

useEffect(() => {
  setB(a + 1); // ⚡ BASIS: "Double Render Detected"
}, [a]);

return <button onClick={() => setA(a + 1)}>Pulse Basis</button>;
```

Click the button. You should see this in your console:
```
⚡ BASIS | DOUBLE RENDER
📍 Location: YourComponent.tsx
Issue: effect_L5 triggers b in a separate frame.
Fix: Derive b during the render phase (remove effect) or wrap in useMemo.
```

---

### 5. Control & Scope
*   **Ghost Mode:** Disable the visual overlay while keeping console-based forensics active by setting `showHUD={false}` on the provider.
*   **Selective Auditing:** Add `// @basis-ignore` at the top of any file to disable instrumentation. Recommended for:
    *   High-frequency animation logic (>60fps)
    *   Third-party library wrappers
    *   Intentional synchronization (e.g., local mirrors of external caches)

---

## HUD

The optional overlay shows your component's state updates in real time. Purple pulses mark updates coming from Context; red pulses mark state that looks like a redundant copy of something else.

<p align="center">
  <img src="./assets/050Basis.gif" width="800" alt="Basis Demo" />
</p>

> **Note:** The HUD shows updates as they happen. The **Architectural Health Report** (Console) looks at the whole update graph together, so it can catch patterns a single glance at the HUD would miss.

---

## What Basis Detects

Basis watches *when* your state updates and looks for timing patterns that usually mean architectural debt - two states always changing together, an effect immediately re-triggering a render, a click that fans out into updates across unrelated files. Every flag below is a signal to investigate, not a verified defect:

- **⚡ Double Renders (Sync Leaks)** - A `useEffect` triggers a state update immediately after a render, forcing the browser to paint twice.
- **⚡ Prime Movers (Likely Root Causes)** - Skips downstream symptoms and points you to the hook or event most likely to have started the chain reaction. When multiple updates fire in the same tick, Basis ranks candidates by their position in the update graph rather than asserting a single definitive cause.
- **⚡ Fragmented Updates** - A single click forces updates in multiple different files or contexts at once (tearing risk).
- **Context Mirroring** - You're redundantly copying Global Context data into local state, creating two sources of truth.
- **Duplicate State** - Two variables always update at the exact same time and should probably be merged (e.g. `isLoading` + `isSuccess`).
- **🛑 Infinite Loops** - A safety circuit-breaker that kills the auditor before a recursive update freezes your browser.

Under the hood this is timing correlation over an update graph - ideas borrowed loosely from graph theory and signal processing, not a formal proof. [**See examples & fixes →**](https://github.com/liovic/react-state-basis/wiki/The-Forensic-Catalog)

---

## Reports & Telemetry

### Architectural Health Report
Check your entire app's state architecture by running `window.printBasisReport()` in the console.

*   **Refactor Priorities:** Ranks issues by blast radius on the update graph, so you can see which hook or event has the widest fan-out across the rest of your app.
*   **Efficiency Score:** A rough ratio of independent update sources vs effect-driven follow-up updates. Diagnostic, not a grade.
*   **Sync Issues:** Groups variables that tend to update together into clusters (e.g., boolean pairs that are really one piece of state).

### Hardware Telemetry
Verify engine efficiency and heap stability in real-time via `window.getBasisMetrics()`.

---

## Real-World Evidence

Basis has been tested against industry-standard codebases:

*   **Excalidraw (114k⭐)** - Proposed a theme-sync fix [**PR #10637**](https://github.com/excalidraw/excalidraw/pull/10637) (not merged)
*   **shadcn-admin (10k⭐)** - Detected redundant state pattern in viewport detection hooks. [**PR #274**](https://github.com/satnaing/shadcn-admin/pull/274) (merged)

---

## Integrations

### Zustand

Wrap your store with `basisLogger` to give Basis visibility into external
store updates. Store signals appear in the HUD and health report alongside your React state.

```typescript
import { create } from 'zustand';
import { basisLogger } from 'react-state-basis/zustand';

export const useStore = create(
  basisLogger((set) => ({
    theme: 'light',
    toggleTheme: () => set((state) => ({ 
      theme: state.theme === 'light' ? 'dark' : 'light' 
    })),
  }), 'MyStore')
);
```

This enables detection of **Store Mirroring**, **Store Sync Leaks**, and
**Global Event Fragmentation** across React and Zustand state simultaneously.

[See full Zustand example →](./examples/basis-zustand/)

### More integrations coming

Planned: XState, React Query, Redux Toolkit. Community PRs welcome.

---

## Performance & Privacy

**Development:** <1ms overhead per update cycle, zero heap growth  
**Production:** ~0.01ms per hook (monitoring disabled, ~2-3KB bundle)  
**Privacy:** Only tracks update timing, never state values

[**See benchmarks →**](https://github.com/liovic/react-state-basis/wiki/Performance-Forensics)

---

## Documentation & Theory

The engine uses graph and timing heuristics to infer likely architectural issues from *when* state changes, not *what* it changes to. [**The wiki**](https://github.com/liovic/react-state-basis/wiki) explains the full mental model, the math it borrows from, and the engine internals. It is a heuristic, not a proof.

---

## Roadmap

Each version answers a different architectural question:

✓ **v0.4.x** - Detect states that always move together *(The Correlation Era)*  
✓ **v0.5.x** - Detect local copies of Context *(The Decomposition Era)*  
→ **v0.6.x** - Rank which update fans out widest *(The Graph Era)*  
**v0.7.x** - Detect derivative vs. independent state *(The Information Era)*  
**v0.8.x** - Estimate how much local state a component actually needs *(The Manifold Era)*


[**More info**](https://github.com/liovic/react-state-basis/wiki/Roadmap)

---

<div align="center">

Built by [LP](https://github.com/liovic) • [MIT License](https://opensource.org/licenses/MIT)

</div>