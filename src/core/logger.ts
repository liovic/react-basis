// src/core/logger.ts

const STYLES = {
  header: "background: #f39c12; color: white; font-weight: bold; padding: 4px; border-radius: 4px;",
  boot: "background: #27ae60; color: white; padding: 2px 5px; border-radius: 3px 0 0 3px; font-weight: bold;",
  bootSecondary: "background: #2ecc71; color: white; padding: 2px 5px; border-radius: 0 3px 3px 0;",
  problemLabel: "background: #ff4757; color: white; padding: 0 4px; border-radius: 3px; font-family: monospace; font-weight: bold;",
  fixHeader: "font-weight: bold; color: #27ae60;",
  codeBlock: "background: #1e1e1e; color: #d4d4d4; padding: 15px; display: block; margin: 10px 0; border-left: 5px solid #27ae60; font-family: 'Fira Code', monospace; line-height: 22px; border-radius: 4px;",
  hintHeader: "background: #2980b9; color: white; font-weight: bold; border-radius: 3px; padding: 2px;",
  critical: "background: #c0392b; color: white; font-weight: bold; border-radius: 3px; padding: 2px;",
  healthHeader: "background: #2ecc71; color: white; font-weight: bold; padding: 5px; border-radius: 5px;"
};

const parseLabel = (label: string) => {
  const parts = label.split(' -> ');
  return {
    file: parts[0] || "Unknown",
    name: parts[1] || label
  };
};

export const displayBootLog = (windowSize: number) => {
  console.log(
    `%c Basis %c Neural State Monitor v4.0 | Tracking ${windowSize} vectors `,
    STYLES.boot,
    STYLES.bootSecondary
  );
};

export const displayRedundancyAlert = (labelA: string, labelB: string, sim: number, totalDimensions: number) => {
  const infoA = parseLabel(labelA);
  const infoB = parseLabel(labelB);
  const isCrossFile = infoA.file !== infoB.file;

  console.group(`%c 📐 BASIS | REDUNDANCY DETECTED `, STYLES.header);

  console.log(`%c📍 Location: %c ${isCrossFile ? `${infoA.file} & ${infoB.file}` : infoA.file}`, "font-weight: bold;", "color: #3498db;");

  console.log(
    `%cProblem:%c You have two separate states (%c${infoA.name}%c and %c${infoB.name}%c) that are moving in perfect sync. This usually means they represent the same information dimension.`,
    "font-weight: bold; color: #e67e22;", "", 
    STYLES.problemLabel, "",
    STYLES.problemLabel, ""
  );

  console.log(
    `%cHow to fix:%c Avoid manual state synchronization. Delete %cuseState%c for %c${infoB.name}%c and calculate it automatically from %c${infoA.name}%c:

%c // 🛠️ Basis Refactor Suggestion:
 const ${infoB.name} = useMemo(() => deriveFrom(${infoA.name}), [${infoA.name}]); %c`,
    STYLES.fixHeader, "", 
    "color: #ff4757; font-weight: bold;", "", "font-weight: bold;", "", "color: #3498db; font-weight: bold;", "",
    STYLES.codeBlock, ""
  );

  console.groupCollapsed(`%c 🔬 View Mathematical Details (Axler Proof) `, "color: #888; font-size: 10px; cursor: pointer;");
  console.table({
    "Status": "REDUNDANT",
    "Correlation Score": `${(sim * 100).toFixed(2)}%`,
    "Cosine Similarity": sim.toFixed(6),
    "Basis Dimension": totalDimensions
  });
  console.log(`%cBasis Theory:%c These states are collinear. In a Basis, all vectors must be linearly independent. Your state %c${infoB.name}%c lives in the span of %c${infoA.name}%c.`, "font-weight: bold;", "color: #555;", "font-style: italic;", "font-style: italic;");
  console.groupEnd();
  console.groupEnd();
  console.log("\n");
};

export const displayCausalHint = (label: string, source: string) => {
  const infoLabel = parseLabel(label);
  const infoSource = parseLabel(source);

  console.groupCollapsed(`%c 💡 ARCHITECTURAL HINT | CAUSAL LINK `, STYLES.hintHeader);
  console.log(`Variable %c"${infoLabel.name}"%c was updated by an effect triggered by %c"${infoSource.name}"%c.`, "color: #e67e22; font-weight: bold;", "", "color: #3498db; font-weight: bold;", "");
  console.log(`This indicates manual synchronization. Switch to %cuseMemo%c to avoid a double render cycle.`, "color: #2ecc71; font-weight: bold;", "");
  console.groupEnd();
};

export const displayInfiniteLoop = (label: string) => {
  const info = parseLabel(label);
  console.log(`%c 🛑 BASIS CRITICAL | INFINITE LOOP HALTED `, STYLES.critical);
  console.error(`Circuit Breaker triggered on: %c"${info.name}"%c\nReason: State oscillation too high. Application state protected.`, "color: #ff4757; font-weight: bold", "");
};

export const displayHealthReport = (
  history: Map<string, number[]>, 
  similarityFn: (A: number[], B: number[]) => number,
  threshold: number
) => {
  const entries = Array.from(history.entries());
  const total = entries.length;
  if (total === 0) return;

  const matrix: any = {};
  let redundancyCount = 0;

  entries.forEach(([labelA, vecA]) => {
    const infoA = parseLabel(labelA);
    matrix[infoA.name] = {};
    entries.forEach(([labelB, vecB]) => {
      const infoB = parseLabel(labelB);
      const sim = similarityFn(vecA, vecB);
      matrix[infoA.name][infoB.name] = sim > threshold ? `🔴 ${sim.toFixed(2)}` : `🟢 ${sim.toFixed(2)}`;
      if (labelA !== labelB && sim > threshold) redundancyCount++;
    });
  });

  const efficiency = Math.max(0, 100 - (redundancyCount / (total * total)) * 100);

  console.group(`%c 📊 BASIS SYSTEM HEALTH REPORT `, STYLES.healthHeader);
  console.log(`%cEfficiency Score: %c${efficiency.toFixed(1)}%`, "font-weight: bold;", `color: ${efficiency > 80 ? '#2ecc71' : '#e67e22'}; font-size: 16px; font-weight: bold;`);
  console.log("%cState Correlation Matrix:", "font-weight: bold; margin-top: 10px;");
  console.table(matrix);
  console.groupEnd();
};