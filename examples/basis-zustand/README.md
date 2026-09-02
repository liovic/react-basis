# Basis + Zustand

This example shows how to integrate **Zustand** with **React State Basis** (v0.6+).

By wrapping your store with `basisLogger`, Basis can treat Zustand stores as 
**Global State Sources** (Σ), giving the engine full visibility into hybrid 
architectures where local React state and external store state interact.

This lets Basis detect:
- **Store Mirroring** - local state duplicating Zustand store values
- **Global Event Fragmentation** - a single event updating both store and local state simultaneously
- **Store Sync Leaks** - effects driven by store changes forcing extra renders

## Running this example

**Heads up regarding `package.json`:**
Since this repo is a workspace, the dependency is currently pointing to a local tarball (`file:../../react-state-basis-0.6.0.tgz`).

**If you just want to try it out:**
1.  Open `package.json`.
2.  Delete the `react-state-basis` line.
3.  Run `npm install react-state-basis`.
4.  `npm run dev`.

**If you are developing Basis locally:**
1.  Run `npm pack` in the library root.
2.  Make sure the `.tgz` filename matches `package.json`.
3.  `npm install` and `npm run dev`.

---

## The Setup

You just need to wrap your store creator with `basisLogger` and give it a name (so it shows up nicely in the report).

**`src/store.ts`**
```typescript
import { create } from 'zustand';
import { basisLogger } from 'react-state-basis/zustand';

export const useSettingsStore = create(
  // Wrap your config here
  basisLogger((set) => ({
    theme: 'light',
    toggleTheme: () => set((state) => ({ 
      theme: state.theme === 'light' ? 'dark' : 'light' 
    })),
  }), 'GlobalSettingsStore') // <-- Give it a label
);
```

---

## What are we testing here?

The example includes a component in `src/Test.tsx` intentionally written with 
architectural issues to demonstrate **Hybrid State Fragmentation**.

When you click the button, it does two things at once:
1.  Updates the global **Zustand** store.
2.  Updates local **React** state.

### The Result

If you run `window.printBasisReport()` in the console after clicking, Basis will figure out that these two completely different systems are being driven by the same event:

```text
🎯 REFACTOR PRIORITIES (PRIME MOVERS)

 1 ⚡ Global Event (isChanging) (ComplexTest.tsx)
    Global Sync Event: An external trigger is updating 3 roots simultaneously.
    Impacts: ComplexTest.tsx (isChanging, isSaved) + store.ts (GlobalSettingsStore)
```

It also catches the manual sync from store to local state via `useEffect` (Store Sync Leak) and the local copy of store data (Store Mirroring).
