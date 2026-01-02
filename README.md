<p align="center">
  <img src="./assets/logo.png" width="300" alt="Basis Logo">
</p>

[![npm version](https://img.shields.io/npm/v/react-state-basis.svg?style=flat-square)](https://www.npmjs.com/package/react-state-basis)
[![View on GitHub](https://img.shields.io/badge/View_Documentation-GitHub-black?logo=github)](https://github.com/liovic/react-state-basis#readme)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

# 📐 REACT-STATE-BASIS
### **Behavioral State Analysis for React**

It observes how state variables change over time to identify strong correlations that indicate architectural redundancy.

---

**TL;DR:**  
React-State-Basis watches your state like a mathematician: every `useState`, `useReducer`, and even `useEffect`-driven update becomes a tracked signal that turns into a time-series vector. When two signals move identically over time, they're collinear (redundant) - and Basis instantly flags it with location, math details, and a copy-paste refactor to derived state.

---

**React-State-Basis** is a real-time architectural auditing engine that treats a React application as a **dynamic system of discrete-time vectors**. Instead of static linting, which only analyzes syntax, Basis monitors the **State Space Topology** of your application to detect mathematical redundancy (collinearity) and synchronization anti-patterns in real-time.

Inspired by the work of **Sheldon Axler** (*"Linear Algebra Done Right"*), Basis aims to enforce a mathematically optimal "Source of Truth" by ensuring your application state forms a **Basis**.

---

## 📦 Installation

```bash
npm i react-state-basis
```

---

## 🧠 The Philosophy: State as a Vector Space

In a perfectly architected application, every state variable should represent a **unique dimension of information**. 

Mathematically, your state variables $\{v_1, v_2, \dots, v_n\}$ should form a **Basis** for your application's state space $V$. A Basis must be **linearly independent**. If two variables update in perfect synchronization, they are **collinear** (linearly dependent). This creates:
1.  **Redundant Renders:** Multiple cycles for a single logical change.
2.  **State Desynchronization:** High risk of "impossible states" (e.g., `user` exists but `isLoggedIn` is false).
3.  **Architectural Entropy:** High cognitive load in tracing data causality.

---
## 🚀 See It In Action

> ### 💡 Detecting Causal Links & Double Renders
![alt text](./example/screenshots/causal.gif)

**The Problem:** Manually syncing `fahrenheit` via `useEffect` creates a "Double Render Cycle" (React renders once for Celsius, then again for Fahrenheit).

**The Basis Solution:** Basis identifies this sequential dependency in real-time. It flags the `Causal Link` and provides a copy-paste refactor to move from expensive state synchronization to a pure **Mathematical Projection** (`useMemo`).

> ### 🕸️ Identifying Boolean Entanglement
![alt text](./example/screenshots/booleanEntanglement.gif)

**The Problem:** Using multiple boolean flags (`isLoading`, `isSuccess`, `hasData`) often leads to "impossible states" and redundant updates.

**The Basis Discovery:** Even though these are separate variables, Basis monitors their transition vectors and detects they are **perfectly synchronized**. 

**The Insight:** It flags a **Dimension Collapse**, alerting you that 3 independent state variables are actually spanning only 1 dimension of information. It suggests consolidating them into a single state machine or a status string.

> ### 🛑 Circuit Breaker (Infinite Loop Protection)
![Infinite Loop GIF](./example/screenshots/infiniteLoopTrap.gif)

**The Trap:** A recursive `useEffect` that triggers an infinite state oscillation, a common mistake that usually freezes the browser's main thread.

**The Intervention:** Basis acts as a real-time stability monitor. If it detects a high-frequency state oscillation (e.g., 25 updates within 500ms), it automatically activates the **Circuit Breaker**.

**The Result:** The engine forcefully halts the update chain before the browser locks up. It provides a critical diagnostic report with the exact location of the loop, allowing you to fix the bug without having to kill the browser process.

> ### 🌐 Cross-Context Dependency Audit
![Cross-Context Sync GIF](./example/screenshots/initiateGlobalSync.gif)

**The Scenario:** Modern apps often split state into multiple providers (e.g., `AuthContext` and `ThemeContext`). While architecturally decoupled, they are often **manually synchronized** in logic (e.g., switching to "dark theme" every time a user logs in).

**The Global Discovery:** Basis performs a **Global State Space Audit**. It doesn't care where your state lives in the component tree; it only cares about the **temporal signals**. 

**The Insight:** By initiating a "Global Sync," Basis identifies that `user` and `theme` are moving in perfect synchronization. It exposes **hidden coupling** between disparate parts of your architecture.

**The Benefit:** This helps architects identify states that should potentially be merged or derived from a single source of truth, even when they are physically separated across different providers.

> ### 📊 System Health & Structural Audit
![System Health Report](./example/screenshots/systemHealthReport.gif)

**System Rank & Efficiency:** Basis performs a global audit of your state space to calculate its **Mathematical Rank**—the actual number of independent information dimensions. An efficiency of **40% (Rank: 4/10)** warns you that 60% of your state is mathematically redundant.

**Redundancy Clusters:** Instead of a raw matrix, Basis automatically groups "entangled" variables into **Redundancy Clusters**. Whether they are booleans in a single component or states across different contexts, Basis identifies them as a single, collapsed dimension if they move in perfect sync.

**Cross-Context Discovery:** The report exposes hidden dependencies across your entire tree (e.g., identifying that `theme` in one context is perfectly correlated with `user` in another).

**Architectural KPI:** Use the **Efficiency Score** as a real-time health metric. Your goal is to reach **100% Efficiency**, where every state variable in your application is linearly independent and serves as a true "Source of Truth."

Try the full interactive demo here: [/example](./example)

---

## How react-state-basis is different from existing tools

There are many great tools for React state management and debugging. Basis doesn't try to replace them - it solves a very specific pain point that most of them don't address directly: detecting behavioral redundancy at runtime (when two or more states always change together, even if they contain different values).

Here's a quick comparison:

| Tool / Approach                  | Static analysis | Runtime behavior tracking | Detects temporal synchronization | Gives refactor suggestions | Overhead in production | Focus on mathematical independence |
|----------------------------------|-----------------|----------------------------|----------------------------------|----------------------------|------------------------|-------------------------------------|
| ESLint + plugins (no-redundant-state, etc.) | ✅             | ❌                         | ❌                               | Partial (rules only)       | None                   | ❌                                  |
| React DevTools               | ❌             | Partial (component tree)   | ❌                               | No                         | Low                    | ❌                                  |
| Why Did You Render           | ❌             | ✅ (render tracking)       | Partial (render causes)          | No                         | Removable              | ❌                                  |
| Redux/Zustand DevTools       | ❌             | ✅ (store changes)         | ❌ (only store level)            | No                         | Removable              | ❌                                  |
| react-state-basis (Basis)    | Partial (Babel) | ✅                         | ✅ (tick-based sync detection)   | ✅ (copy-paste useMemo)     | Zero (change imports)  | ✅ (inspired by linear algebra)     |

Basis shines when:
- You have manual state syncing (`setA → setB` in effects/onClick/etc.)
- Multiple booleans or flags that are always updated together
- You want to know which state is the true "source of truth" without guessing
- You want runtime insights that linters can't see (because they don't run the code)

It is not trying to be a full state manager, linter replacement, or performance profiler.  
It is a specialized diagnostic tool for one very common anti-pattern - and it tries to do that one thing really well.


---

## 🚀 Setup & Integration

To enable the mathematical monitoring of your application, follow these two steps:

### 1. Initialize the Basis Monitor
Wrap your application root (e.g., `main.tsx` or `App.tsx`) with the `BasisProvider`. Setting `debug={true}` enables the real-time diagnostic dashboard and the visual system status monitor.

```tsx
import { BasisProvider } from 'react-state-basis';

export default function Root() {
  return (
    <BasisProvider debug={true}>
       <App />
    </BasisProvider>
  );
}
```

### 2. Use Drop-in Replacement Imports
Replace your standard React hook imports with `react-state-basis`. This allows the engine to instrument your state updates without changing your component logic.

**Standard Named Imports (Recommended):**
```tsx
// ❌ Change this:
// import { useState, useEffect } from 'react';

// ✅ To this:
import { 
  useState, 
  useEffect, 
  useMemo, 
  useCallback,
  useContext, 
  useRef, 
  useLayoutEffect, 
  useId, 
  useSyncExternalStore,
  useDeferredValue, 
  useTransition
} from 'react-state-basis';

function MyComponent() {
  const [data, setData] = useState([]); // Automatically vectorized and tracked
}
```

**Namespace Imports:**
Basis also supports namespace imports if you prefer to keep your hooks grouped:
```tsx
import * as Basis from 'react-state-basis';

function MyComponent() {
  const [count, setCount] = Basis.useState(0); // Also tracked automatically
}
```

### 3. The Babel plugin
The Babel plugin is optional but highly recommended. Without it, state variables will be tracked as anonymous_state, making it difficult to identify specific redundancies in large applications. You can also manually provide a label as the last argument to any hook if you prefer not to use Babel.

> If you choose not to use the Babel plugin, you can still get specific labels by passing a string as the last argument:

```tsx
const [count, setCount] = useState(0, "MyComponent -> count");
```

To get the most out of Basis, you should enable the Babel plugin. This automatically injects the **filename** and **variable name** into your hooks so you don't have to label them manually.

If you are using **Vite**, add the following to your `vite.config.ts`:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        // Automatically labels useState, useMemo, etc. 
        // for richer diagnostics in the console.
        plugins: [['react-state-basis/plugin']]
      }
    })
  ]
})
```


---

## 🕵️‍♂️ Technical Architecture

React-State-Basis utilizes a three-tier instrumentation pipeline to audit your system:

### 1. The Compiler Layer (Babel AST)
A build-time plugin performs static analysis, injecting the **filename** and **variable name** directly into the runtime calls. This transforms an anonymous execution graph into a **structured state map**.

### 2. The Runtime Layer (Signal Mapping)
Every state transition is intercepted. Basis groups updates occurring within a **16ms window** into a single "System Tick." Each state variable is mapped to a vector in $\mathbb{R}^{50}$.
*   `1` = State transition occurred in this tick.
*   `0` = State remained stagnant.

React-State-Basis does not compare state values. It analyzes the timing and synchronization of updates, treating each state variable as a discrete activation signal over time.

### 3. The Analysis Layer (The Heuristic)
In pure Linear Algebra, proving linear independence for $N$ variables requires solving the system $a_1v_1 + \dots + a_nv_n = 0$. Using algorithms like Gaussian elimination or SVD to determine the **Rank** of the state matrix has a computational complexity of $O(N^3)$. Running this in a browser runtime for every state update would be prohibitively expensive.

To maintain real-time performance, React-State-Basis uses **Cosine Similarity** as a high-speed heuristic ($O(D)$, where $D$ is the vector dimension) to detect **pairwise collinearity**:

```math
\text{similarity} = \cos(\theta) = \frac{\mathbf{A} \cdot \mathbf{B}}{\Vert \mathbf{A} \Vert \Vert \mathbf{B} \Vert}
```

If $\cos(\theta) \approx 1.00$, the vectors are collinear (linearly dependent), and the engine triggers a redundancy alert.

---

## 📝 Real-World Demonstration: The Auth Anti-Pattern

Developers often manually sync related states, creating a redundant dimension in the Basis:

### ❌ Redundant Basis (State Bloat)
```tsx
const [user, setUser] = useState(null);
const [isLogged, setIsLogged] = useState(false);

const onLogin = (userData) => {
  setUser(userData);
  setIsLogged(true); // ⚠️ BASIS ALERT: Always updated in sync with 'user'
};
```
**Engine Analysis:** The Engine calculates that `user` and `isLogged` are perfectly synchronized. It warns you that you are using two dimensions to describe a 1D problem.

### ✅ Independent Basis (Optimal Design)
Basis suggests a **Projection**-transforming a basis vector into a derived value.
```tsx
const [user, setUser] = useState(null); 
const isLogged = useMemo(() => !!user, [user]); // Mathematically clean
```

---

## 🖥️ Diagnostic Dashboard

Basis provides high-end diagnostic feedback directly in your browser console:

*   **📍 Location Tracking:** Identifies exact files and variable names causing redundancy.
*   **🛠️ Refactor Snippets:** Provides dark-themed code blocks you can copy-paste to fix your state architecture.
*   **📊 Health Matrix:** Call `printBasisReport()` to see your **Efficiency Score** and the full **Correlation Matrix** of your application.

---

## ✨ Key Features

*   **🕵️‍♂️ Content-Agnostic:** Identifies logical links through temporal synchronization, not data types.
*   **🛡️ Circuit Breaker:** Halts high-frequency state oscillations (Infinite Loops) to protect the browser thread.
*   **💡 Causal Detective:** Tracks causality chains from `useEffect` to `useState` to identify cascading renders.
*   **🔄 Zero Lock-in:** Simply point your imports back to `'react'` in production. Basis is a **Development-time verification infrastructure**.

---

## 🎓 Mathematical Inspiration

### 📜 The Basis Theorem
According to Axler (*Linear Algebra Done Right, Definition 2.27*):

> A **basis** of $V$ is a list of vectors in $V$ that is **linearly independent** and **spans** $V$.

To satisfy this theorem in the context of application state:

1.  **Linear Independence:** No state variable in the list can be expressed as a linear combination of the others. If a state $v_n$ can be derived from $\{v_1, \dots, v_{n-1}\}$, the list is linearly dependent and contains redundancy.
2.  **Spanning the Space:** The list of state variables must contain enough information to represent every possible configuration of the user interface.

React-State-Basis ensures that your state list is a true Basis by identifying and flagging vectors that fail the test of linear independence.

> *"Linear algebra is the study of linear maps on finite-dimensional vector spaces."*  
> - **Sheldon Axler**

React-State-Basis bridges the gap between abstract algebra and UI engineering.
By ensuring your application state forms an independent, non-redundant basis, it helps you build software that is inherently more stable, efficient, and easier to reason about.
---

### 📜 Implementation of the Linear Dependency Lemma
According to Axler (*Lemma 2.21*), in a linearly dependent **list** of vectors, there exists an index $j$ such that $v_j$ is in the span of the **preceding** vectors ($v_1, \dots, v_{j-1}$).

**React-State-Basis** implements this sequential logic to audit your state:

1.  **The Ordered List:** Every state variable is treated as an element in an ordered list $(v_1, v_2, \dots, v_n)$ based on its registration order in the application.
2.  **Sequential Discovery:** As time progresses, the engine monitors the list. It doesn't just look for "similar" vectors; it looks for vectors that **fail to add a new dimension** to the subspace generated by the vectors that came before them.
3.  **Identifying the Redundant Element:** If $v_{isLogged}$ is perfectly correlated with $v_{user}$, the engine identifies that $v_{isLogged} \in \text{span}(v_{user})$. Since $v_{user}$ preceded it, $v_{isLogged}$ is mathematically the redundant element.
4.  **Basis Reduction:** Following the lemma's second conclusion, the engine advises removing $v_j$, proving that the "information span" of your app remains identical while the complexity of the Basis decreases.

---

## ⚠️ Design Constraints & Heuristics

React-State-Basis uses probabilistic, time-windowed heuristics to approximate linear dependence.
As with any runtime analysis:

- Rarely-updated states may appear correlated by chance
- High-frequency UI interactions may trigger conservative warnings
- Results are advisory, not prescriptive

React-State-Basis is designed to **surface architectural questions**, not enforce correctness.

---

## ❓ Frequently Asked Questions

### **Is React-State-Basis a replacement for React DevTools or linters?**
No.

React-State-Basis complements existing tools.  
Linters analyze **code structure**, and React DevTools show **component behavior**. React-State-Basis analyzes **state relationships over time**-something neither tool is designed to detect.

It answers questions like:
- *“Why do these two states always change together?”*
- *“Which state is the true source of truth?”*
- *“Am I manually synchronizing derived data?”*

---

### **Does this change React behavior or execution order?**
No.

React-State-Basis **does not modify React’s scheduling, rendering, or reconciliation**.  
It observes state updates at runtime and logs diagnostics during development.

Removing React-State-Basis restores your application to standard React behavior with no residual effects.

---

### **Is this safe to use in production?**
React-State-Basis is designed for **development-time analysis**.

While it is technically safe to run in production, it:
- adds runtime overhead
- logs diagnostic output
- performs continuous analysis

For production builds, simply switch your imports back to `'react'`.

---

### **How accurate is the redundancy detection?**
React-State-Basis uses **time-windowed behavioral analysis**, not formal proofs.

This means:
- Strong, consistent correlations are highly reliable indicators of redundancy
- Rare or coincidental correlations may trigger conservative warnings

All results are **advisory** and should be interpreted as architectural signals, not errors.

---

### **Can this detect all redundant state?**
No-and that’s intentional.

React-State-Basis detects **behavioral redundancy**, not semantic equivalence.  
Two states may contain the same *data* but update independently, which is architecturally valid.

React-State-Basis only flags redundancy when two states behave as a single information dimension over time.

---

### **Why not just use selectors or derived state manually?**
You should-and React-State-Basis encourages that.

The challenge is *finding* where derived state should exist in large or evolving codebases. React-State-Basis helps identify:
- state that should be derived
- state that is unintentionally synchronized
- state that adds no new information

It surfaces opportunities for refactoring, not rules you must follow.

---

### **Does this work with Redux, Zustand, or other state managers?**
React-State-Basis currently instruments **React hooks directly**.

However, the underlying model is store-agnostic. Any system with:
- discrete state updates
- identifiable update points
- consistent labeling

could theoretically be analyzed using the same approach.

---

### **What about performance?**
React-State-Basis is optimized for real-time use in development.

Key design choices:
- Fixed-size sliding windows
- O(D) similarity checks
- Batched analysis every N ticks

For typical applications, overhead is negligible. For extremely high-frequency updates (e.g., animations), React-State-Basis may emit conservative warnings.

---

### **Is this “formal verification”?**
No.

React-State-Basis performs **runtime architectural auditing**, not formal mathematical verification.  
It applies concepts from linear algebra to **observe and analyze behavior**, not to prove correctness.

---

### **Who is this tool for?**
React-State-Basis is best suited for:
- Medium to large React applications
- Codebases with complex state interactions
- Engineers debugging synchronization bugs
- Teams prioritizing architectural clarity

It may be unnecessary for small or short-lived projects.

---

### **Why linear algebra?**
Because state redundancy *is* linear dependence.

If two state variables always change together, they span the same dimension of information. Linear algebra provides a precise language-and useful tools-for detecting and reasoning about that relationship.

---

### **Will this ever produce false positives?**
Yes.

React-State-Basis favors **visibility over silence**.  
When in doubt, it surfaces potential issues so developers can make informed decisions.

Think of it as an architectural smoke detector-not a fire marshal.

---

## 🗺️ Roadmap: The Path to Architectural Rigor

React-State-Basis is evolving from a runtime auditor to a complete development infrastructure. Here is the planned trajectory:

### **v0.2.0 - Full Hook Parity (DONE)**
The goal is to make Basis a complete drop-in replacement for the standard React API.
*   **Complete API Coverage:** Adding support for `useRef`, `useCallback`, `useLayoutEffect`, `useTransition`, `useDeferredValue`
*   **Babel Enhancements:** Automated labeling for the entire hook suite to ensure zero-manual-config diagnostics.
*   **Signature Robustness:** Smart disambiguation between dependency arrays and manual labels.

### **v0.3.0 - Modernity & Production Strategy**
Aligning with the future of React and ensuring zero production cost.
*   **React 19 Support:** Integration of `use()`, `useOptimistic()`, and `useActionState()` into the vector space model.
*   **Zero-Overhead Production:** Implementing **Conditional Exports**. When in production mode, Basis will pass through raw React hooks with zero logic, ensuring no performance penalty.

### **v0.4.0 - Developer Ecosystem & Visuals**
Tools for better ergonomics and high-level insights.
*   **CLI Utilities (`rsb-init`, `rsb-clean`):** Automated codemods to instantly inject or remove Basis from large codebases. No more manual search-and-replace.
*   **State-Space Visualizer:** A 2D topology map showing "Redundancy Clusters." Visualize your state vectors as physical nodes to identify where the architecture is collapsing.

### **v1.0.0 - Formal Verification**
*   **Architectural Gatekeeping:** CI/CD integration to fail builds on infinite loops or critical dimension collapses.
*   **KPI Tracking:** Long-term monitoring of your application’s **System Efficiency Score**.

---

### 📬 Get Involved
If you have an idea for a mathematical heuristic or a DX improvement, feel free to open an issue or a PR.

---
*Developed by LP*  
*For engineers who treat software as applied mathematics.* 🚀📐