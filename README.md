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
Add the plugin to your `vite.config.ts`. The Babel plugin auto-labels your hooks—you continue importing from `react` as normal.

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
Drop this pattern into any component. Basis will identify the rhythm of the debt within ~100ms.

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
*   **Ghost Mode:** Disable the Matrix UI while keeping console-based forensics active by setting `showHUD={false}` on the provider.
*   **Selective Auditing:** Add `// @basis-ignore` at the top of any file to disable instrumentation. Recommended for:
    *   High-frequency animation logic (>60fps)
    *   Third-party library wrappers
    *   Intentional synchronization (e.g., local mirrors of external caches)

---

## HUD

The optional HUD shows your **State Basis Matrix** in real-time. Purple pulses ($\Omega$) are Context anchors; Red pulses (!) are redundant shadows.

<p align="center">
  <img src="./assets/050Basis.gif" width="800" alt="Basis Demo" />
</p>

> **Note:** While the HUD visualizes real-time updates, the **Architectural Health Report** (Console) provides the deep topological analysis.

---

## What Basis Detects

Basis draws on ideas from graph theory, signal processing, and linear algebra to flag architectural issues static linters miss:

- **⚡ Double Renders (Sync Leaks)** - Detects when a `useEffect` triggers a state update immediately after a render, forcing the browser to paint twice.
- **⚡ Prime Movers (Root Causes)** - Ignores downstream symptoms and points you to the exact hook or event that started the chain reaction.
- **⚡ Fragmented Updates** - Detects when a single click forces updates in multiple different files/contexts simultaneously (Tearing risk).
- **Ω Context Mirroring** - Detects when you redundantly copy Global Context data into Local State (creating two sources of truth).
- **♊ Duplicate State** - Identifies variables that always update at the exact same time and should be merged (e.g. `isLoading` + `isSuccess`).
- **🛑 Infinite Loops** - A safety circuit-breaker that kills the auditor before a recursive update freezes your browser.

[**See examples & fixes →**](https://github.com/liovic/react-state-basis/wiki/The-Forensic-Catalog)

---

## Reports & Telemetry

### Architectural Health Report
Check your entire app's state architecture by running `window.printBasisReport()` in the console.

*   **Refactor Priorities:** Ranks issues with eigenvector centrality on the update graph so you can see which hook or event fans out the most.
*   **Efficiency Score:** A rough ratio of independent update sources vs effect-driven follow-up updates. Diagnostic, not a grade.
*   **Sync Issues:** Groups entangled variables into clusters (e.g., Boolean Explosions).

### Hardware Telemetry
Verify engine efficiency and heap stability in real-time via `window.getBasisMetrics()`.

---

## Real-World Evidence

Basis is verified against industry-standard codebases to ensure high-fidelity detection:

*   **Excalidraw (114k⭐)** - Proposed a theme-sync fix [**PR #10637**](https://github.com/excalidraw/excalidraw/pull/10637) (not merged)
*   **shadcn-admin (10k⭐)** - Detected redundant state pattern in viewport detection hooks. [**PR #274**](https://github.com/satnaing/shadcn-admin/pull/274) (merged)

---

## Integrations

### Zustand

Wrap your store with `basisLogger` to give Basis visibility into external
store updates. Store signals appear as Σ in the HUD and health report.

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

Basis is built on heuristics inspired by **Signal Processing**, **Linear Algebra**, and **Graph Theory**. [**The wiki**](https://github.com/liovic/react-state-basis/wiki) explains the mental model and the engine. It is a heuristic, not a proof.

---

## Roadmap

Each era of Basis answers a different architectural question:

✓ **v0.4.x** - The Correlation Era - *Are these states moving together?*  
✓ **v0.5.x** - The Decomposition Era - *Is this local state just a copy of Context?*  
→ **v0.6.x** - The Graph Era - *Which bug should I fix first for maximum impact?*  
**v0.7.x** - The Information Era - *Does this state carry real information, or is it derivative?*   
**v0.8.x** - The Manifold Era - *How many hooks does your component actually need?*


[**More info**](https://github.com/liovic/react-state-basis/wiki/Roadmap)

---

<div align="center">

Built by [LP](https://github.com/liovic) • [MIT License](https://opensource.org/licenses/MIT)

</div>
