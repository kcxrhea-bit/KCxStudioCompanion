export type SmartBrainTaskType =
  | "bug fix"
  | "UI polish"
  | "build error"
  | "feature request"
  | "refactor"
  | "optimization"
  | "diagnostics"
  | "architecture"
  | "test"
  | "release"
  | "docs";

export type SmartBrainRiskLevel = "Safe" | "Medium" | "Risky";

export interface SmartBrainNormalizedSpec {
  projectName: string;
  goal: string;
  taskType: SmartBrainTaskType;
  riskLevel: SmartBrainRiskLevel;
  rewriteRisk: boolean;
  sanitizedInput: string;
  filesToInspect: string[];
  filesAllowedToEdit: string[];
  doNotTouch: string[];
  requirements: string[];
  safetyRules: string[];
  testCommands: string[];
  expectedResult: string;
  structuredPrompt: string;
  warnings: string[];
  diagnostics: {
    originalInput: string;
    detectedTaskType: SmartBrainTaskType;
    classificationReason: string;
    riskLevel: SmartBrainRiskLevel;
    rewriteRisk: boolean;
    unsafeInstructionsDetected: string[];
    replacementsApplied: string[];
    sanitizedInput: string;
    effectiveInput: string;
    scopeReduced: boolean;
    filesToInspect: string[];
    filesAllowedToEdit: string[];
    // kept for normTrace compatibility
    rewriteReduced: boolean;
  };
}

type CachedContext = {
  projectName?: string;
  filesFound?: string[];
  frameworks?: string[];
  majorSourceFolders?: string[];
  detectedTypes?: string[];
  buildLogTail?: string;
  lastErrorType?: string;
  ollamaStatus?: string;
};

const REWRITE_RISK_PHRASES = [
  "rewrite",
  "redo",
  "replace everything",
  "start over",
  "rebuild the whole",
  "refactor everything",
  "redo everything",
  "redo the whole",
];

type UnsafeInstructionRule = {
  pattern: RegExp;
  replacement: string;
  label: string;
};

function matchesRule(rule: UnsafeInstructionRule, input: string): boolean {
  rule.pattern.lastIndex = 0;
  return rule.pattern.test(input);
}

const UNSAFE_REPLACEMENTS: UnsafeInstructionRule[] = [
  { pattern: /\bjust push it\b/gi, replacement: "commit and push the changes after review", label: "just push it" },
  { pattern: /\bpush it\b/gi, replacement: "commit and push the changes after review", label: "push it" },
  { pattern: /\bdeploy it\b/gi, replacement: "prepare the release artifacts for review", label: "deploy it" },
  { pattern: /\bdelete (it|everything|all)\b/gi, replacement: "remove the identified component safely", label: "delete it" },
  { pattern: /\binstall (whatever|anything)\b/gi, replacement: "install the required dependency after review", label: "install whatever" },
  { pattern: /\bmake it work somehow\b/gi, replacement: "identify and apply the minimal fix needed", label: "make it work somehow" },
  { pattern: /\bchange everything\b/gi, replacement: "apply targeted changes to the affected files", label: "change everything" },
  { pattern: /\bfix all of it\b/gi, replacement: "address each identified issue individually", label: "fix all of it" },
  { pattern: /\bfix everything\b/gi, replacement: "address each identified issue individually", label: "fix everything" },
  { pattern: /\bjust do it\b/gi, replacement: "apply the change with care", label: "just do it" },
  { pattern: /\bwhatever works\b/gi, replacement: "use the approach best suited to the codebase", label: "whatever works" },
  { pattern: /\bcopy[- ]paste\b/gi, replacement: "reuse the most applicable existing pattern from the codebase", label: "copy paste" },
  { pattern: /\b(rewrite|rebuild) (it|everything|the whole|the entire)\b/gi, replacement: "apply targeted improvements to the specific areas identified", label: "rewrite it/everything" },
  { pattern: /\breplace (everything|the whole|the entire|all)\b/gi, replacement: "identify and replace only the specific components that require change", label: "replace everything" },
  { pattern: /\brun random commands?\b/gi, replacement: "run only the commands required and verified for this task", label: "run random commands" },
  { pattern: /\bnuke\b/gi, replacement: "remove the specific identified components safely", label: "nuke" },
];

const RISKY_SCOPE_KEYWORDS = [
  "all files", "entire codebase", "every file", "everything", "whole project",
  "all components", "all modules", "across the board",
];

const DEPENDENCY_KEYWORDS = [
  "npm install", "yarn add", "pip install", "gradle dependency",
  "add dependency", "install package",
];

const DESTRUCTIVE_KEYWORDS = [
  "delete", "remove all", "drop table", "truncate", "wipe", "purge",
  "rm -rf", "clean everything", "nuke",
];

const PRODUCTION_KEYWORDS = [
  "production", "release build", "publish", "deploy to prod", "ship it",
  "go live", "push to main", "merge to main",
];

function classifyTaskType(input: string, ctx: CachedContext): { type: SmartBrainTaskType; reason: string } {
  const lower = input.toLowerCase();
  if (/\b(architecture|arch|system design|layer|boundary|dependency graph|coupling|cohesion|module structure)\b/.test(lower))
    return { type: "architecture", reason: "architecture/design keywords detected" };
  if (/\b(diagnos|debug|trace|profile|inspect|investigate|why is|what's wrong|root cause|logging|telemetry|monitoring)\b/.test(lower))
    return { type: "diagnostics", reason: "diagnostic/investigation keywords detected" };
  if (/\b(optim|performance|speed|slow|fast|memory|cpu|bundle size|lazy load|cache|memoiz|debounce|throttle)\b/.test(lower))
    return { type: "optimization", reason: "performance/optimization keywords detected" };
  if (/\b(bug|fix|crash|error|exception|broken|failing|doesn'?t work|not working)\b/.test(lower)) {
    if (ctx.lastErrorType && /build|compile|gradle|typescript|ksp/i.test(ctx.lastErrorType))
      return { type: "build error", reason: "bug keywords + build error context" };
    return { type: "bug fix", reason: "bug/fix keywords detected" };
  }
  if (/\b(build error|compile error|gradle|ksp|typescript error|unresolved)\b/.test(lower))
    return { type: "build error", reason: "build/compile error keywords detected" };
  if (/\b(ui|style|layout|color|font|padding|margin|css|design|polish|appearance|visual|icon|button|spacing)\b/.test(lower))
    return { type: "UI polish", reason: "UI/style keywords detected" };
  if (/\b(refactor|clean up|restructure|reorganize|simplify|decouple|extract|rewrite|redo|rebuild)\b/.test(lower))
    return { type: "refactor", reason: "refactor keywords detected" };
  if (/\b(test|spec|unit test|integration test|coverage|jest|vitest)\b/.test(lower))
    return { type: "test", reason: "test/spec keywords detected" };
  if (/\b(release|version bump|changelog|publish|deploy|ship|tag)\b/.test(lower))
    return { type: "release", reason: "release/publish keywords detected" };
  if (/\b(doc|readme|comment|jsdoc|documentation|wiki|guide)\b/.test(lower))
    return { type: "docs", reason: "documentation keywords detected" };
  return { type: "feature request", reason: "no specific category matched; treated as feature request" };
}

function detectRiskLevel(input: string): SmartBrainRiskLevel {
  const lower = input.toLowerCase();
  const scopeHit = RISKY_SCOPE_KEYWORDS.some((kw) => lower.includes(kw));
  const depHit = DEPENDENCY_KEYWORDS.some((kw) => lower.includes(kw));
  const destructiveHit = DESTRUCTIVE_KEYWORDS.some((kw) => lower.includes(kw));
  const productionHit = PRODUCTION_KEYWORDS.some((kw) => lower.includes(kw));
  const rewriteHit = REWRITE_RISK_PHRASES.some((p) => lower.includes(p));

  const score =
    (scopeHit ? 2 : 0) +
    (depHit ? 1 : 0) +
    (destructiveHit ? 2 : 0) +
    (productionHit ? 1 : 0) +
    (rewriteHit ? 2 : 0);

  if (score >= 3) return "Risky";
  if (score >= 1) return "Medium";
  return "Safe";
}

function detectRewriteRisk(input: string): boolean {
  const lower = input.toLowerCase();
  return REWRITE_RISK_PHRASES.some((p) => lower.includes(p));
}

function detectUnsafeInstructions(input: string): string[] {
  const found: string[] = [];
  for (const rule of UNSAFE_REPLACEMENTS) {
    if (matchesRule(rule, input)) found.push(rule.label);
  }
  return found;
}

function sanitizeInput(input: string): { sanitized: string; replacementsApplied: string[] } {
  let out = input;
  const replacementsApplied: string[] = [];
  for (const rule of UNSAFE_REPLACEMENTS) {
    if (matchesRule(rule, out)) {
      replacementsApplied.push(rule.label);
      rule.pattern.lastIndex = 0;
      out = out.replace(rule.pattern, rule.replacement);
    }
  }
  return { sanitized: out.trim(), replacementsApplied };
}

function inferFilesToInspect(taskType: SmartBrainTaskType, ctx: CachedContext, memory?: CortexMemoryHints): string[] {
  const discovered = (ctx.filesFound ?? []).slice(0, 8);
  if (discovered.length > 0) return discovered;
  // Merge top memory files (up to 4) into heuristic fallback when available
  const memoryFiles = memory?.topFiles.slice(0, 4) ?? [];
  let heuristic: string[];
  switch (taskType) {
    case "UI polish": heuristic = ["src/renderer/App.tsx", "src/renderer/styles/app.css"]; break;
    case "build error": heuristic = ["src/lib/buildAnalysis.ts", "src/main/main.ts"]; break;
    case "bug fix": heuristic = ["src/renderer/App.tsx", "src/lib/"]; break;
    case "refactor": heuristic = ["src/renderer/App.tsx", "src/lib/"]; break;
    case "optimization": heuristic = ["src/renderer/App.tsx", "src/lib/"]; break;
    case "diagnostics": heuristic = ["src/renderer/App.tsx", "src/main/main.ts", "src/lib/"]; break;
    case "architecture": heuristic = ["src/renderer/", "src/lib/", "src/main/"]; break;
    case "test": heuristic = ["tests/"]; break;
    case "release": heuristic = ["src/main/release.ts", "package.json"]; break;
    case "docs": heuristic = ["README.md"]; break;
    default: heuristic = ["src/renderer/App.tsx", "src/lib/"];
  }
  if (memoryFiles.length === 0) return heuristic;
  // Prepend memory-weighted files, then fill with heuristic (deduped)
  const merged = [...memoryFiles];
  for (const f of heuristic) {
    if (!merged.includes(f)) merged.push(f);
  }
  return merged.slice(0, 8);
}

function inferFilesAllowedToEdit(taskType: SmartBrainTaskType, ctx: CachedContext): string[] {
  const discovered = (ctx.filesFound ?? []).slice(0, 6);
  if (discovered.length > 0) return discovered;
  switch (taskType) {
    case "UI polish": return ["src/renderer/App.tsx", "src/renderer/styles/app.css"];
    case "build error": return ["src/lib/buildAnalysis.ts"];
    case "bug fix": return ["src/renderer/App.tsx", "src/lib/"];
    case "refactor": return ["src/renderer/App.tsx", "src/lib/"];
    case "optimization": return ["src/renderer/App.tsx", "src/lib/"];
    case "diagnostics": return ["src/renderer/App.tsx", "src/lib/"];
    case "architecture": return ["src/renderer/", "src/lib/", "src/main/"];
    case "test": return ["tests/"];
    case "release": return ["src/main/release.ts"];
    case "docs": return ["README.md"];
    default: return ["src/renderer/App.tsx"];
  }
}

function buildRequirements(taskType: SmartBrainTaskType, goal: string): string[] {
  const base = [`Goal accomplished: ${goal}`];
  if (taskType === "build error") base.push("Build passes with no TypeScript or Gradle errors.");
  if (taskType === "bug fix") base.push("The reported behavior no longer occurs.", "No regressions in adjacent functionality.");
  if (taskType === "UI polish") base.push("Visual change matches intent.", "No layout regressions.");
  if (taskType === "test") base.push("All tests pass.", "New tests cover the described scenario.");
  if (taskType === "refactor") base.push("Behavior is unchanged.", "No regressions.");
  if (taskType === "optimization") base.push("Measurable improvement with no behavioral regressions.");
  if (taskType === "diagnostics") base.push("Root cause identified and documented.", "Diagnostic output is local-only.");
  if (taskType === "architecture") base.push("Structural change is minimal and reversible.", "Existing behavior is fully preserved.");
  if (taskType === "release") base.push("Version is correct.", "Build is clean.");
  return base;
}

function buildExpectedResult(taskType: SmartBrainTaskType, goal: string): string {
  switch (taskType) {
    case "build error": return `Build succeeds after fixing: ${goal}`;
    case "bug fix": return `Bug resolved — ${goal}`;
    case "UI polish": return `UI updated — ${goal}`;
    case "test": return `Tests pass — ${goal}`;
    case "refactor": return `Code refactored cleanly — ${goal}`;
    case "optimization": return `Performance improved — ${goal}`;
    case "diagnostics": return `Root cause identified — ${goal}`;
    case "architecture": return `Architecture improved — ${goal}`;
    case "release": return `Release prepared — ${goal}`;
    case "docs": return `Documentation updated — ${goal}`;
    default: return `Feature implemented — ${goal}`;
  }
}

export interface CortexMemoryHints {
  topFiles: string[];
  recentTaskTypes: SmartBrainTaskType[];
  riskFraction: number;
}

export function normalize(spec: string, cachedContext?: unknown, memory?: CortexMemoryHints): SmartBrainNormalizedSpec {
  const ctx = (cachedContext ?? {}) as CachedContext;
  const projectName = ctx.projectName ?? "Unknown project";
  const warnings: string[] = [];

  const rewriteRisk = detectRewriteRisk(spec);
  const riskLevel = detectRiskLevel(spec);
  const unsafeInstructionsDetected = detectUnsafeInstructions(spec);
  const { sanitized, replacementsApplied } = sanitizeInput(spec);
  const { type: taskType, reason: classificationReason } = classifyTaskType(spec, ctx);

  // When rewrite risk is detected, prepend a scope-reduction instruction
  const effectiveSanitized = rewriteRisk
    ? `Inspect the specific areas that need improvement and apply targeted minimal changes only. Do not perform a broad rewrite. ${sanitized}`
    : sanitized;

  if (rewriteRisk) {
    warnings.push("Rewrite risk detected. Scope reduced to targeted improvements only.");
  }
  if (riskLevel === "Risky") {
    warnings.push("High-risk operation detected. Operator review is required before execution.");
  }
  if (DEPENDENCY_KEYWORDS.some((kw) => effectiveSanitized.toLowerCase().includes(kw))) {
    warnings.push("Dependency install detected. Approval required before running install commands.");
  }

  // Memory-influenced warnings
  if (memory && memory.riskFraction > 0.5) {
    warnings.push("Note: recent prompts have been predominantly high-risk. Review scope carefully.");
  }

  const goal = effectiveSanitized.length > 120 ? effectiveSanitized.slice(0, 120) + "…" : effectiveSanitized;
  const filesToInspect = inferFilesToInspect(taskType, ctx, memory);
  const filesAllowedToEdit = inferFilesAllowedToEdit(taskType, ctx);
  const doNotTouch = [
    "ValhallaPage.tsx",
    "CortexRuntime.ts (structure)",
    "CortexExecutionSandbox.ts",
    "CortexExecutionPermissions.ts",
    "package.json (unless explicitly requested)",
    "vite.config.ts",
    "tsconfig.json",
  ];
  const requirements = buildRequirements(taskType, goal);
  const safetyRules = [
    "No broad rewrites. Surgical patches only.",
    "No dependency changes without explicit approval.",
    "Do not touch unrelated systems.",
    "Verify with: npm test -- --runInBand && npm run build",
  ];
  const testCommands = ["npm test -- --runInBand", "npm run build"];
  const expectedResult = buildExpectedResult(taskType, goal);

  // Only include file lists in structuredPrompt when using heuristic defaults,
  // not when they mirror discovered files (which the outer Ollama prompt already lists).
  const usingDiscoveredFiles = (ctx.filesFound ?? []).length > 0;
  const recentTypeCount = memory?.recentTaskTypes.filter((t) => t === taskType).length ?? 0;
  const memoryContextLine = recentTypeCount >= 2
    ? `Familiar area: "${taskType}" has appeared ${recentTypeCount} times recently in this project.`
    : "";
  const structuredPrompt = [
    `Project: ${projectName}`,
    `Goal: ${goal}`,
    `Task type: ${taskType}`,
    `Risk level: ${riskLevel}`,
    memoryContextLine,
    usingDiscoveredFiles ? "" : `Files to inspect: ${filesToInspect.join(", ")}`,
    usingDiscoveredFiles ? "" : `Files allowed to edit: ${filesAllowedToEdit.join(", ")}`,
    `Do not touch: ${doNotTouch.join(", ")}`,
    `Requirements: ${requirements.join(" | ")}`,
    `Safety rules: ${safetyRules.join(" | ")}`,
    `Test commands: ${testCommands.join(" && ")}`,
    `Expected result: ${expectedResult}`,
    warnings.length > 0 ? `Warnings: ${warnings.join(" | ")}` : "",
  ].filter(Boolean).join("\n");

  return {
    projectName,
    goal,
    taskType,
    riskLevel,
    rewriteRisk,
    sanitizedInput: effectiveSanitized,
    filesToInspect,
    filesAllowedToEdit,
    doNotTouch,
    requirements,
    safetyRules,
    testCommands,
    expectedResult,
    structuredPrompt,
    warnings,
    diagnostics: {
      originalInput: spec,
      detectedTaskType: taskType,
      classificationReason,
      riskLevel,
      rewriteRisk,
      unsafeInstructionsDetected,
      replacementsApplied,
      sanitizedInput: sanitized,
      effectiveInput: effectiveSanitized,
      scopeReduced: rewriteRisk,
      filesToInspect,
      filesAllowedToEdit,
      rewriteReduced: rewriteRisk,
    },
  };
}
