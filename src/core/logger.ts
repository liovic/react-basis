// src/core/logger.ts

import { calculateCosineSimilarity } from "./math";
import { identifyTopIssues } from "./ranker";
import { RingBufferMetadata, SignalRole, RankedIssue, ViolationDetail } from "./types";
import { instance } from "../engine";
import { parseLabel } from "./label";

const isWeb = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const LAST_LOG_TIMES = new Map<string, number>();
const LOG_COOLDOWN = 3000;

const THEME = {
  identity: "#6C5CE7", // Purple (Brand)
  problem: "#D63031", // Red (Bugs)
  solution: "#FBC531", // Yellow (Fixes)
  context: "#0984E3", // Blue (Locations)
  muted: "#9AA0A6", // Gray (Metadata)
  border: "#2E2E35",
  success: "#00b894", // Green (Good Score)
};

const STYLES = {
  // Structure
  basis: `background: ${THEME.identity}; color: white; font-weight: bold; padding: 2px 6px; border-radius: 3px;`,
  headerIdentity: `background: ${THEME.identity}; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;`,
  headerProblem: `background: ${THEME.problem}; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;`,
  version: `background: #a29bfe; color: #2d3436; padding: 2px 6px; border-radius: 3px; margin-left: -4px;`,

  // Actions
  actionLabel: `color: ${THEME.solution}; font-weight: bold;`,
  actionPill: `color: ${THEME.solution}; font-weight: bold; border: 1px solid ${THEME.solution}; padding: 0 4px; border-radius: 3px;`,

  // Context
  impactLabel: `color: ${THEME.context}; font-weight: bold;`,
  location: `color: ${THEME.context}; font-family: monospace; font-weight: bold;`,

  // Text
  subText: `color: ${THEME.muted}; font-size: 11px;`,
  bold: "font-weight: bold;",
  label: "background: #dfe6e9; color: #2d3436; padding: 0 4px; border-radius: 3px; font-family: monospace; font-weight: bold; border: 1px solid #b2bec3;",
};

const shouldLog = (key: string) => {
  const now = Date.now();
  const last = LAST_LOG_TIMES.get(key) || 0;
  if (now - last > LOG_COOLDOWN) {
    LAST_LOG_TIMES.set(key, now);
    return true;
  }
  return false;
};

// Helper: Detects boolean flags vs data
const isBooleanLike = (name: string) =>
  /^(is|has|can|should|did|will|show|hide)(?=[A-Z_])/.test(name);

// --- SUGGESTION LOGIC ---
const getSuggestedFix = (issue: RankedIssue, info: { name: string }): string => {

  // 1. GLOBAL EVENT (Split State)
  if (issue.label.includes('Global Event')) {
    return `These variables update together but live in different hooks/files. Consolidate them into a single %cuseReducer%c or atomic store update.`;
  }

  const violations = issue.violations || [];
  const leaks = violations.filter(v => v.type === 'causal_leak');
  const mirrors = violations.filter(v => v.type === 'context_mirror');
  const duplicates = violations.filter(v => v.type === 'duplicate_state');

  // 2. CONTEXT MIRRORING (Shadow State)
  if (mirrors.length > 0) {
    return `Local state is 'shadowing' Global Context. This creates two sources of truth. ` +
      `Delete the local state and consume the %cContext%c value directly.`;
  }

  // 3. EFFECT CHAINS (Double Render)
  if (leaks.length > 0) {
    const targetName = parseLabel(leaks[0].target).name;

    // If driven by an Effect
    if (issue.label.includes('effect')) {
      return `This Effect triggers a synchronous re-render of ${targetName}. ` +
        `Calculate ${targetName} during the render phase (Derived State) or wrap in %cuseMemo%c if expensive.`;
    }
    // If driven by State (A -> B)
    return `State cascading detected. ${info.name} triggers ${targetName} in a separate frame. ` +
      `Merge them into one object to update simultaneously.`;
  }

  // 4. DUPLICATE STATE (Restored Logic)
  if (duplicates.length > 0) {
    // Boolean Explosion Logic
    if (isBooleanLike(info.name)) {
      return `Boolean Explosion detected. Multiple flags are toggling in sync. ` +
        `Replace impossible states with a single %cstatus%c string ('idle' | 'loading' | 'success').`;
    }
    return `Redundant State detected. This variable carries no unique information. ` +
      `Derive it from the source variable during render, or use %cuseMemo%c to cache the result.`;
  }

  // 5. HIGH FREQUENCY
  if (issue.metric === 'density') {
    return `High-Frequency Update. This variable updates faster than the frame rate. ` +
      `Apply %cdebounce%c or move to a Ref to unblock the main thread.`;
  }

  return `Check the dependency chain of ${info.name}.`;
};


export const displayHealthReport = (history: Map<string, RingBufferMetadata>, threshold: number, violationMap: Map<string, ViolationDetail[]>) => {
  if (!isWeb) return;
  const entries = Array.from(history.entries());
  if (entries.length === 0) return;

  const topIssues = identifyTopIssues(instance.graph, history, instance.redundantLabels, violationMap);

  console.group(`%c 📊 BASIS | ARCHITECTURAL HEALTH REPORT `, STYLES.headerIdentity);

  // 1. REFACTOR PRIORITIES
  if (topIssues.length > 0) {
    console.log(`%c🎯 REFACTOR PRIORITIES %c(PRIME MOVERS)`,
      `font-weight: bold; color: ${THEME.identity}; margin-top: 10px;`,
      `font-weight: normal; color: ${THEME.muted}; font-style: italic;`
    );

    topIssues.forEach((issue, idx) => {
      const info = parseLabel(issue.label);
      const icon = issue.metric === 'influence' ? '⚡' : '📈';

      const pColor = idx === 0 ? THEME.problem : idx === 1 ? THEME.solution : THEME.identity;

      let displayName = info.name;
      let displayFile = info.file;

      if (issue.label.includes('Global Event')) {
        displayName = info.name;
        displayFile = info.file;
      }

      console.group(
        ` %c${idx + 1}%c ${icon} ${displayName} %c(${displayFile})`,
        `background: ${pColor}; color: ${idx === 1 ? 'black' : 'white'}; border-radius: 50%; padding: 0 5px;`,
        "font-family: monospace; font-weight: 700;",
        `color: ${THEME.muted}; font-size: 10px; font-weight: normal; font-style: italic;`
      );

      console.log(`%c${issue.reason}`, `color: ${THEME.muted}; font-style: italic;`);

      // IMPACTS: Grouped by File
      if (issue.violations.length > 0) {
        const byFile = new Map<string, string[]>();

        issue.violations.forEach(v => {
          if (issue.label.includes('Global Event') && v.type === 'context_mirror') return;
          const { file, name } = parseLabel(v.target);
          if (!byFile.has(file)) byFile.set(file, []);
          byFile.get(file)!.push(name);
        });

        const impactParts: string[] = [];
        byFile.forEach((vars, file) => {
          const varList = vars.join(', ');
          impactParts.push(`${file} (${varList})`);
        });

        if (impactParts.length > 0) {
          console.log(`%cImpacts: %c${impactParts.join(' + ')}`, STYLES.impactLabel, "");
        }
      }

      // SOLUTION
      const fix = getSuggestedFix(issue, info);
      const fixParts = fix.split('%c');

      if (fixParts.length === 3) {
        console.log(
          `%cSolution: %c${fixParts[0]}%c${fixParts[1]}%c${fixParts[2]}`,
          STYLES.actionLabel,
          "",
          STYLES.actionPill,
          ""
        );
      } else {
        console.log(
          `%cSolution: %c${fix}`,
          STYLES.actionLabel,
          ""
        );
      }

      console.groupEnd();
    });
    console.log("\n");
  }

  // 2. EFFICIENCY SCORE
  const clusters: string[][] = [];
  const processed = new Set<string>();
  let independentCount = 0;

  // A. Redundancy Check
  entries.forEach(([labelA, metaA]) => {
    if (processed.has(labelA)) return;
    const currentCluster = [labelA];
    processed.add(labelA);
    entries.forEach(([labelB, metaB]) => {
      if (labelA === labelB || processed.has(labelB)) return;
      if (calculateCosineSimilarity(metaA.buffer, metaB.buffer) > threshold) {
        if (metaA.role === SignalRole.CONTEXT && metaB.role === SignalRole.CONTEXT) return;
        currentCluster.push(labelB);
        processed.add(labelB);
      }
    });
    if (currentCluster.length > 1) clusters.push(currentCluster); else independentCount++;
  });

  // B. Causality Check (Graph Penalty)
  const totalVars = entries.length;
  const redundancyScore = ((independentCount + clusters.length) / totalVars) * 100;

  let internalEdges = 0;
  instance.graph.forEach((targets, source) => {
    if (source.startsWith('Event_Tick_')) return;
    internalEdges += targets.size;
  });

  const causalPenalty = (internalEdges / totalVars) * 100;

  let healthScore = redundancyScore - causalPenalty;
  if (healthScore < 0) healthScore = 0;

  const scoreColor = healthScore > 85 ? THEME.success : THEME.problem;

  console.log(`%cSystem Efficiency: %c${healthScore.toFixed(1)}%`,
    STYLES.bold, `color: ${scoreColor}; font-weight: bold;`
  );
  console.log(`%cSources of Truth: ${independentCount + clusters.length}/${totalVars} | Causal Leaks: ${internalEdges}`, STYLES.subText);

  // 3. SYNC ISSUES
  if (clusters.length > 0) {
    console.log(`%cDetected ${clusters.length} Sync Issues:`, `font-weight: bold; color: ${THEME.problem}; margin-top: 10px;`);

    clusters.forEach((cluster, idx) => {
      const clusterMetas = cluster.map(l => ({
        label: l,
        meta: history.get(l)!,
        name: parseLabel(l).name
      }));
      const hasCtx = clusterMetas.some(c =>
        c.meta.role === SignalRole.CONTEXT || c.meta.role === SignalRole.STORE
      );

      const names = clusterMetas.map(c => {
        const prefix = c.meta.role === SignalRole.STORE ? 'Σ ' : c.meta.role === SignalRole.CONTEXT ? 'Ω ' : '';
        return `${prefix}${c.name}`;
      }).join(' ⟷ ');

      console.group(` %c${idx + 1}%c ${names}`, `background: ${THEME.problem}; color: white; border-radius: 50%; padding: 0 5px;`, "font-family: monospace; font-weight: bold;");

      if (hasCtx) {
        const hasStore = clusterMetas.some(c => c.meta.role === SignalRole.STORE);
        const sourceType = hasStore ? 'External Store' : 'global context';
        console.log(`%cDiagnosis: ${hasStore ? 'Store' : 'Context'} Mirroring. Local state is shadowing ${sourceType}.`, `color: ${THEME.problem};`);
        console.log(`%cSolution: Use ${sourceType} directly to avoid state drift.`, STYLES.actionLabel);
      } else {
        const boolKeywords = ['is', 'has', 'can', 'should', 'loading', 'success', 'error', 'active', 'enabled', 'open', 'visible'];
        const boolCount = clusterMetas.filter(c =>
          boolKeywords.some(kw => c.name.toLowerCase().startsWith(kw))
        ).length;

        const isBoolExplosion = cluster.length > 2 && (boolCount / cluster.length) > 0.5;
        if (isBoolExplosion) {
          console.log(`%cDiagnosis:%c Boolean Explosion. Multiple booleans updating in sync.`, STYLES.bold, "");
          console.log(`%cSolution:%c Combine into a single %cstatus%c string or a %creducer%c.`, STYLES.actionLabel, "", STYLES.actionPill, "", STYLES.actionPill, "");
        } else if (cluster.length > 2) {
          console.log(`%cDiagnosis:%c Sibling Updates. These states respond to the same event.`, STYLES.bold, "");
          console.log(`%cSolution:%c This may be intentional. If not, consolidate into a %creducer%c.`, STYLES.actionLabel, "", STYLES.actionPill, "");
        } else {
          console.log(`%cDiagnosis:%c Redundant State. Variables always change together.`, STYLES.bold, "");
          console.log(`%cSolution:%c Derive one from the other via %cuseMemo%c.`, STYLES.actionLabel, "", STYLES.actionPill, "");
        }
      }
      console.groupEnd();
    });
  } else {
    console.log("%c✨ Your architecture is clean. No redundant state detected.", `color: ${THEME.success}; font-weight: bold;`);
  }
  console.groupEnd();
};

// --- LIVE STREAM LOGGERS ---

export const displayRedundancyAlert = (labelA: string, metaA: RingBufferMetadata, labelB: string, metaB: RingBufferMetadata, sim: number) => {
  if (!isWeb || !shouldLog(`redundant-${labelA}-${labelB}`)) return;
  const infoA = parseLabel(labelA);
  const infoB = parseLabel(labelB);
  const isContextMirror = (metaA.role === SignalRole.LOCAL && metaB.role === SignalRole.CONTEXT) ||
    (metaB.role === SignalRole.LOCAL && metaA.role === SignalRole.CONTEXT);

  const isStoreMirror = (metaA.role === SignalRole.LOCAL && metaB.role === SignalRole.STORE) ||
    (metaB.role === SignalRole.LOCAL && metaA.role === SignalRole.STORE);

  const alertType = isContextMirror ? 'CONTEXT MIRRORING' : isStoreMirror ? 'STORE MIRRORING' : 'DUPLICATE STATE';
  console.group(`%c ♊ BASIS | ${alertType} `, STYLES.headerProblem);
  console.log(`%c📍 Location: %c${infoA.file}`, STYLES.bold, STYLES.location);
  console.log(`%cIssue:%c ${infoA.name} and ${infoB.name} are synchronized (${(sim * 100).toFixed(0)}%).`, STYLES.bold, "");

  if (isContextMirror || isStoreMirror) {
    const sourceType = isStoreMirror ? 'External Store' : 'Global Context';
    console.log(`%cFix:%c Local state is 'shadowing' ${sourceType}. Delete the local state and consume the %c${sourceType}%c value directly.`,
      STYLES.bold, "",
      STYLES.actionPill, ""
    );
  } else {
    if (isBooleanLike(infoA.name) || isBooleanLike(infoB.name)) {
      console.log(`%cFix:%c Boolean Explosion detected. Merge flags into a single %cstatus%c string or %cuseReducer%c.`,
        STYLES.bold, "",
        STYLES.actionPill, "",
        STYLES.actionPill, ""
      );
    } else {
      console.log(`%cFix:%c Redundant State detected. Derive %c${infoB.name}%c from %c${infoA.name}%c during render, or use %cuseMemo%c.`,
        STYLES.bold, "",
        STYLES.label, "",
        STYLES.label, "",
        STYLES.actionPill, ""
      );
    }
  }
  console.groupEnd();
};

export const displayCausalHint = (targetLabel: string, targetMeta: RingBufferMetadata, sourceLabel: string, sourceMeta: RingBufferMetadata) => {
  if (!isWeb || !shouldLog(`causal-${sourceLabel}-${targetLabel}`)) return;
  const target = parseLabel(targetLabel);
  const source = parseLabel(sourceLabel);
  const headerType = sourceMeta.role === SignalRole.CONTEXT
    ? 'CONTEXT SYNC LEAK'
    : sourceMeta.role === SignalRole.STORE
      ? 'STORE SYNC LEAK'
      : 'DOUBLE RENDER';

  const isEffect = sourceLabel.includes('effect') || sourceLabel.includes('useLayoutEffect');

  console.groupCollapsed(`%c ⚡ BASIS | ${headerType} `, STYLES.headerProblem);
  console.log(`%c📍 Location: %c${target.file}`, STYLES.bold, STYLES.location);
  console.log(`%cIssue:%c ${source.name} triggers ${target.name} in separate frames.`, STYLES.bold, "");

  if (isEffect) {
    console.log(`%cFix:%c Derive %c${target.name}%c during the render phase (remove effect) or wrap in %cuseMemo%c.`,
      STYLES.bold, "",
      STYLES.label, "",
      STYLES.actionPill, ""
    );
  } else {
    console.log(`%cFix:%c Merge %c${target.name}%c with %c${source.name}%c into a single state update.`,
      STYLES.bold, "",
      STYLES.label, "",
      STYLES.label, ""
    );
  }
  console.groupEnd();
};

export const displayViolentBreaker = (label: string, count: number, threshold: number) => {
  if (!isWeb) return;
  const { name } = parseLabel(label);
  console.group(`%c 🛑 BASIS CRITICAL | CIRCUIT BREAKER `, STYLES.headerProblem);
  console.error(`INFINITE LOOP DETECTED\nVariable: ${name}\nFrequency: ${count} updates/sec`);
  console.log(`%cACTION: Update BLOCKED to prevent browser freeze.`, `color: ${THEME.problem}; font-weight: bold;`);
  console.groupEnd();
};

export const displayBootLog = (windowSize: number) => {
  if (!isWeb) return;
  console.log(`%cBasis%cAuditor%c "Graph Era" (Window: ${windowSize})`, STYLES.basis, STYLES.version, `color: ${THEME.muted}; font-style: italic; margin-left: 8px;`);
};