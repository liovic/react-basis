# 🧪 React-State-Basis Demo - Live Examples

This folder contains a fully runnable demo app that showcases **React-State-Basis** detecting real-world state anti-patterns in real time.

You'll see beautiful, actionable diagnostic output in the browser console — including redundancy alerts, causal hints, refactor suggestions, and a full system health report.

---

## 🛠️ What's Inside?

The demo application consists of three "Scientific Labs" designed to break state architecture:

1.  **Weather Causal Lab:** Demonstrates how `useEffect` based synchronization creates "Double Render Cycles" and how Basis suggests a **Mathematical Projection** (`useMemo`) as a fix.
2.  **Boolean Entanglement:** Showcases **Dimension Collapse** when multiple booleans (isLoading, isSuccess, hasData) are updated in sync.
3.  **System Stability Trap:** A controlled infinite loop that triggers the Basis **Circuit Breaker** to protect the browser thread.
4.  **Global Neural Controller:** Demonstrates **Cross-Context Audit** by identifying hidden coupling between Auth and Theme providers.

---

## 🚀 Quick Start

To run this example locally:

```bash
# 1. Enter the example directory
cd example

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Then open your browser at `http://localhost:5173` and **open the DevTools Console (F12)** to see Basis in action.

---

## 🖥️ How to Audit

Once the app is running:
1.  Click the various **Trigger** buttons in the UI.
2.  Watch the console for **📐 BASIS** alerts.
3.  Click the **"Generate System Health Report"** button at the bottom to see a structural analysis of the entire application's state space.