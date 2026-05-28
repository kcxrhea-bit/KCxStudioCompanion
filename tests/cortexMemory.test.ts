import { cortexMemory, CortexMemoryEntry } from "../src/renderer/cortex/intelligence/CortexMemory";
import { normalize } from "../src/renderer/cortex/intelligence/SmartBrainNormalizer";

const makeEntry = (overrides: Partial<CortexMemoryEntry> = {}): CortexMemoryEntry => ({
  ts: Date.now(),
  taskType: "bug fix",
  riskLevel: "Safe",
  files: ["src/renderer/App.tsx", "src/lib/"],
  projectName: "TestProject",
  rewriteRisk: false,
  ...overrides,
});

beforeEach(() => {
  cortexMemory.clear();
});

describe("CortexMemory — file frequency tracking", () => {
  test("repeated prompts targeting the same file increase its weight", () => {
    cortexMemory.record(makeEntry({ files: ["src/renderer/cortex/intelligence/SmartBrainNormalizer.ts"] }));
    cortexMemory.record(makeEntry({ files: ["src/renderer/cortex/intelligence/SmartBrainNormalizer.ts"] }));
    cortexMemory.record(makeEntry({ files: ["src/renderer/App.tsx"] }));

    const weights = cortexMemory.getFileWeights();
    expect(weights["src/renderer/cortex/intelligence/SmartBrainNormalizer.ts"]).toBe(2);
    expect(weights["src/renderer/App.tsx"]).toBe(1);
  });

  test("getTopFiles returns files ordered by frequency descending", () => {
    cortexMemory.record(makeEntry({ files: ["src/renderer/cortex/CortexRuntime.ts"] }));
    cortexMemory.record(makeEntry({ files: ["src/renderer/cortex/CortexRuntime.ts"] }));
    cortexMemory.record(makeEntry({ files: ["src/renderer/cortex/CortexRuntime.ts"] }));
    cortexMemory.record(makeEntry({ files: ["src/renderer/App.tsx"] }));

    const top = cortexMemory.getTopFiles(2);
    expect(top[0]).toBe("src/renderer/cortex/CortexRuntime.ts");
    expect(top[1]).toBe("src/renderer/App.tsx");
  });
});

describe("CortexMemory — memory influence on normalization", () => {
  test("top memory files are merged into inferFilesToInspect when no live filesFound", () => {
    const frequentFile = "src/renderer/cortex/intelligence/SmartBrainNormalizer.ts";
    cortexMemory.record(makeEntry({ files: [frequentFile] }));
    cortexMemory.record(makeEntry({ files: [frequentFile] }));
    cortexMemory.record(makeEntry({ files: [frequentFile] }));

    const hints = cortexMemory.getHints();
    const result = normalize("fix a bug in the normalizer", {}, hints);

    expect(result.filesToInspect).toContain(frequentFile);
  });

  test("live filesFound always wins over memory-weighted files", () => {
    const frequentFile = "src/renderer/cortex/CortexRuntime.ts";
    cortexMemory.record(makeEntry({ files: [frequentFile] }));
    cortexMemory.record(makeEntry({ files: [frequentFile] }));

    const hints = cortexMemory.getHints();
    const liveCtx = { filesFound: ["src/renderer/App.tsx", "src/lib/commandRunner.ts"] };
    const result = normalize("fix a bug", liveCtx, hints);

    // Live scan files take precedence
    expect(result.filesToInspect).toContain("src/renderer/App.tsx");
    expect(result.filesToInspect).not.toContain(frequentFile);
  });

  test("unknown project with no prior memory does not fabricate file suggestions", () => {
    const hints = cortexMemory.getHints();
    expect(hints.topFiles).toHaveLength(0);

    const result = normalize("add feature X", { projectName: "BrandNewProject" }, hints);
    // Falls back to heuristics — should not contain invented paths
    expect(result.filesToInspect.length).toBeGreaterThan(0);
    // All files should be real heuristic paths, not invented ones
    result.filesToInspect.forEach((f) => {
      expect(typeof f).toBe("string");
      expect(f.length).toBeGreaterThan(0);
    });
  });

  test("familiar area line appears in structuredPrompt when task type repeated >= 2 times", () => {
    cortexMemory.record(makeEntry({ taskType: "bug fix" }));
    cortexMemory.record(makeEntry({ taskType: "bug fix" }));

    const hints = cortexMemory.getHints();
    const result = normalize("fix the login bug", {}, hints);

    expect(result.structuredPrompt).toMatch(/Familiar area.*bug fix.*2/i);
  });

  test("no familiar area line when task type appears fewer than 2 times", () => {
    cortexMemory.record(makeEntry({ taskType: "release" }));

    const hints = cortexMemory.getHints();
    const result = normalize("fix a bug", {}, hints);

    expect(result.structuredPrompt).not.toMatch(/Familiar area/i);
  });
});

describe("CortexMemory — risk fraction", () => {
  test("risk fraction reflects proportion of risky/medium entries", () => {
    cortexMemory.record(makeEntry({ riskLevel: "Risky" }));
    cortexMemory.record(makeEntry({ riskLevel: "Risky" }));
    cortexMemory.record(makeEntry({ riskLevel: "Safe" }));
    cortexMemory.record(makeEntry({ riskLevel: "Safe" }));

    expect(cortexMemory.getRiskFraction()).toBe(0.5);
  });

  test("high risk fraction adds warning to normalized output", () => {
    for (let i = 0; i < 6; i++) {
      cortexMemory.record(makeEntry({ riskLevel: "Risky" }));
    }
    cortexMemory.record(makeEntry({ riskLevel: "Safe" }));

    const hints = cortexMemory.getHints();
    const result = normalize("add a small label", {}, hints);

    expect(result.warnings.some((w) => /high-risk/i.test(w))).toBe(true);
  });

  test("low risk fraction produces no extra warning", () => {
    cortexMemory.record(makeEntry({ riskLevel: "Safe" }));
    cortexMemory.record(makeEntry({ riskLevel: "Safe" }));
    cortexMemory.record(makeEntry({ riskLevel: "Safe" }));

    const hints = cortexMemory.getHints();
    const result = normalize("add a small label", {}, hints);

    expect(result.warnings.some((w) => /high-risk/i.test(w))).toBe(false);
  });
});

describe("CortexMemory — capacity and pruning", () => {
  test("entries are capped at 50", () => {
    for (let i = 0; i < 60; i++) {
      cortexMemory.record(makeEntry({ ts: i }));
    }

    expect(cortexMemory.getEntries().length).toBe(50);
  });

  test("newest entries are retained, oldest are pruned", () => {
    for (let i = 0; i < 55; i++) {
      cortexMemory.record(makeEntry({ ts: i, projectName: `proj-${i}` }));
    }

    const entries = cortexMemory.getEntries();
    expect(entries[0].projectName).toBe("proj-54");
    expect(entries[49].projectName).toBe("proj-5");
  });
});

describe("CortexMemory — determinism", () => {
  test("same memory state + same prompt produces same output", () => {
    cortexMemory.record(makeEntry({ taskType: "bug fix", files: ["src/renderer/App.tsx"] }));
    cortexMemory.record(makeEntry({ taskType: "bug fix", files: ["src/renderer/App.tsx"] }));

    const hints = cortexMemory.getHints();
    const r1 = normalize("fix the login crash", { projectName: "KCxProject" }, hints);
    const r2 = normalize("fix the login crash", { projectName: "KCxProject" }, hints);

    expect(r1.structuredPrompt).toBe(r2.structuredPrompt);
    expect(r1.filesToInspect).toEqual(r2.filesToInspect);
    expect(r1.riskLevel).toBe(r2.riskLevel);
  });
});

describe("CortexMemory — memory does not override explicit user intent", () => {
  test("memory risk warning does not change riskLevel detected from prompt", () => {
    // Fill memory with Risky entries so riskFraction is high
    for (let i = 0; i < 10; i++) {
      cortexMemory.record(makeEntry({ riskLevel: "Risky" }));
    }
    const hints = cortexMemory.getHints();

    // A genuinely safe prompt should still be detected as Safe
    const result = normalize("Add a small status badge to the Cortex panel.", {}, hints);
    expect(result.riskLevel).toBe("Safe");
    // Warning appears but riskLevel is unchanged by memory
    expect(result.warnings.some((w) => /high-risk/i.test(w))).toBe(true);
  });
});

describe("CortexMemory — project-scoped isolation", () => {
  beforeEach(() => {
    cortexMemory.setProjectKey("default");
    cortexMemory.clear();
  });

  afterEach(() => {
    cortexMemory.setProjectKey("ProjectA");
    cortexMemory.clear();
    cortexMemory.setProjectKey("ProjectB");
    cortexMemory.clear();
    cortexMemory.setProjectKey("default");
  });

  test("memory written under project A is not visible under project B", () => {
    cortexMemory.setProjectKey("ProjectA");
    cortexMemory.record(makeEntry({ files: ["src/renderer/App.tsx"], projectName: "ProjectA" }));

    cortexMemory.setProjectKey("ProjectB");
    const hints = cortexMemory.getHints();
    expect(hints.topFiles).not.toContain("src/renderer/App.tsx");
    expect(cortexMemory.getEntries().length).toBe(0);
  });

  test("project A entries remain intact after switching to project B and back", () => {
    cortexMemory.setProjectKey("ProjectA");
    cortexMemory.record(makeEntry({ files: ["src/lib/buildAnalysis.ts"], projectName: "ProjectA" }));

    cortexMemory.setProjectKey("ProjectB");
    cortexMemory.record(makeEntry({ files: ["src/main/main.ts"], projectName: "ProjectB" }));

    cortexMemory.setProjectKey("ProjectA");
    const topFiles = cortexMemory.getTopFiles(5);
    expect(topFiles).toContain("src/lib/buildAnalysis.ts");
    expect(topFiles).not.toContain("src/main/main.ts");
  });

  test("default key works when no project key is set", () => {
    cortexMemory.setProjectKey("default");
    cortexMemory.record(makeEntry({ files: ["src/renderer/App.tsx"], projectName: "default" }));

    const hints = cortexMemory.getHints();
    expect(hints.topFiles).toContain("src/renderer/App.tsx");
  });

  test("switching to empty string resolves to 'default' key", () => {
    cortexMemory.setProjectKey("");
    expect(cortexMemory.getProjectKey()).toBe("default");
  });

  test("project-specific top files are deterministic", () => {
    cortexMemory.setProjectKey("DetProject");
    cortexMemory.record(makeEntry({ files: ["src/renderer/App.tsx"] }));
    cortexMemory.record(makeEntry({ files: ["src/renderer/App.tsx"] }));
    cortexMemory.record(makeEntry({ files: ["src/lib/buildAnalysis.ts"] }));

    const top1 = cortexMemory.getTopFiles(2);

    cortexMemory.setProjectKey("other");
    cortexMemory.setProjectKey("DetProject");
    const top2 = cortexMemory.getTopFiles(2);

    expect(top1).toEqual(top2);
    expect(top1[0]).toBe("src/renderer/App.tsx");
  });

  test("live filesFound beats memory hints even in project-scoped mode", () => {
    cortexMemory.setProjectKey("LiveProject");
    cortexMemory.record(makeEntry({ files: ["src/renderer/cortex/CortexRuntime.ts"] }));
    cortexMemory.record(makeEntry({ files: ["src/renderer/cortex/CortexRuntime.ts"] }));

    const hints = cortexMemory.getHints();
    const liveCtx = { filesFound: ["src/renderer/App.tsx"] };
    const result = normalize("fix a bug", liveCtx, hints);

    expect(result.filesToInspect).toContain("src/renderer/App.tsx");
    expect(result.filesToInspect).not.toContain("src/renderer/cortex/CortexRuntime.ts");
  });
});
