/**
 * Pure business-logic functions extracted from src/renderer/App.tsx.
 * App.tsx contains these inline; this module makes them importable for tests.
 * Once stable, App.tsx can be refactored to import from here.
 */

import type { ApprovalItem, BuildAnalysisResult, BuildIntelligence, Project, SafetyWarning, SystemState } from '../renderer/types';

export const splitList = (value: string): string[] =>
  value.split(/\r?\n|,/).map((v) => v.trim()).filter(Boolean);

export const parseBuildIntel = (logs: string): BuildIntelligence => ({
  buildSuccessful: /BUILD SUCCESSFUL/i.test(logs),
  buildFailed: /BUILD FAILED/i.test(logs),
  kotlinCompileErrors: (logs.match(/kotlin.*error|e:\s.*\.kt[:\s]|\.kt:\d+|Unresolved reference|Expecting an expression|Expecting member declaration/gi) || []).length,
  typescriptErrors: (logs.match(/TS\d{4}|typescript.*error/gi) || []).length,
  gradleErrors: (logs.match(/gradle.*error|\* What went wrong/gi) || []).length,
  missingDependencyErrors: (logs.match(/cannot find module|could not resolve|missing dependency|unresolved reference/gi) || []).length,
});

export const analyzeHeuristic = (raw: string): BuildAnalysisResult[] => {
  const issues: BuildAnalysisResult[] = [];
  const lines = raw.split(/\r?\n/);
  const seen = new Set<string>();
  const fallbackCategories = new Set<string>();
  const kotlinMessagePattern = /(Syntax error|Expecting an expression|Expecting member declaration|Unresolved reference(?::\s*[A-Za-z_][A-Za-z0-9_]*)?|Type mismatch|None of the following functions can be called[^.]*)/i;
  const roomKspPattern = /\b(ksp|RoomProcessor|androidx\.room|KspTask|SymbolProcessor|Entity|Dao)\b/i;
  const composePattern = /(@Composable|Composable invocations|Compose Compiler|remember\b|Modifier\b|State<[^>]+>|non-composable context)/i;
  const fileNameOf = (file: string) => (file.split(/[\\/]/).pop() || file).replace(/^file:\/\/\//i, '');
  const normalizeFile = (file: string) => file.replace(/^file:\/\/\//i, '').replace(/\\/g, '/');
  const normalizeMessage = (message: string) => message.replace(/\s+/g, ' ').trim();
  const addIssue = (issue: BuildAnalysisResult, fallbackCategory?: string) => {
    if (fallbackCategory) {
      if (fallbackCategories.has(fallbackCategory)) return;
      fallbackCategories.add(fallbackCategory);
    }
    const key = [
      issue.detectedType.toLowerCase(),
      (issue.file || issue.fileName || issue.likelyFiles[0] || '').toLowerCase(),
      issue.line ?? '',
      normalizeMessage(issue.message || issue.likelyCause || issue.suggestedFix).toLowerCase(),
    ].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    issues.push(issue);
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    let m: RegExpMatchArray | null;

    m = line.match(/(?:^|\s)(?:e:\s*)?((?:file:\/\/\/)?(?:[A-Za-z]:[\\/][^:\r\n]+?\.kt|[A-Za-z0-9_./\\ -]+?\.kt)):(\d+)(?::(\d+))?\s*(.*)$/i);
    if (m) {
      const file = normalizeFile(m[1]);
      const inlineMessage = normalizeMessage(m[4] || '');
      const nextMessage = normalizeMessage(lines.slice(index + 1, index + 4).find((candidate) => kotlinMessagePattern.test(candidate)) || '');
      const message = inlineMessage || nextMessage || 'Kotlin compiler error';
      const symbol = message.match(/Unresolved reference:\s*([A-Za-z_][A-Za-z0-9_]*)/i)?.[1];
      addIssue({ detectedType: 'Kotlin compile error', severity: 'high', likelyCause: message, likelyFiles: [file], likelySymbols: symbol ? [symbol] : [], file, fileName: fileNameOf(file), line: Number(m[2]), column: m[3] ? Number(m[3]) : undefined, message, suggestedFix: 'Fix the Kotlin compiler error at the reported file and line.', confidence: 0.95 });
      continue;
    }

    m = line.match(/([A-Za-z0-9_./-]+\.(ts|tsx|js|jsx))\((\d+),\s*(\d+)\):\s*error\s+TS\d+:\s*Cannot find name ['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/i);
    if (m) {
      addIssue({ detectedType: 'missing symbol', severity: 'high', likelyCause: 'Referenced symbol is missing in scope/imports or was renamed.', likelyFiles: [m[1]], likelySymbols: [m[5]], file: m[1], fileName: fileNameOf(m[1]), line: Number(m[3]), column: Number(m[4]), message: `Cannot find name ${m[5]}`, suggestedFix: 'Check imports, nearby renames, missing declarations, or scope visibility.', confidence: 0.87 });
      continue;
    }

    m = line.match(/Cannot find name ['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/i);
    if (m) {
      addIssue({ detectedType: 'missing symbol', severity: 'high', likelyCause: 'Referenced symbol is missing in scope/imports or was renamed.', likelyFiles: [], likelySymbols: [m[1]], message: `Cannot find name ${m[1]}`, suggestedFix: 'Check imports, nearby renames, missing declarations, or scope visibility.', confidence: 0.85 }, 'missing symbol');
      continue;
    }

    m = line.match(/Cannot find module ['"`]([^'"`]+)['"`]/i);
    if (m) {
      addIssue({ detectedType: 'missing module', severity: 'high', likelyCause: 'Import path points to non-existing module or missing dependency.', likelyFiles: [], likelySymbols: [m[1]], message: `Cannot find module ${m[1]}`, suggestedFix: 'Verify module exists and import path is correct.', confidence: 0.84 }, 'missing module');
      continue;
    }

    m = line.match(/Property ['"`]([A-Za-z_][A-Za-z0-9_]*)['"`] does not exist/i);
    if (m) {
      addIssue({ detectedType: 'missing property', severity: 'medium', likelyCause: 'Property not defined on current type or typo in property name.', likelyFiles: [], likelySymbols: [m[1]], message: `Property ${m[1]} does not exist`, suggestedFix: 'Verify type definition and property spelling.', confidence: 0.82 }, 'missing property');
      continue;
    }

    m = line.match(/([A-Za-z0-9_./-]*AndroidManifest\.xml)/i);
    if (m) {
      addIssue({ detectedType: 'manifest/package issues', severity: 'medium', likelyCause: 'Malformed manifest/package metadata.', likelyFiles: [m[1]], likelySymbols: [], file: m[1], fileName: fileNameOf(m[1]), message: normalizeMessage(line), suggestedFix: 'Validate manifest/package fields and required entries.', confidence: 0.78 });
      continue;
    }

    if (roomKspPattern.test(line))
      addIssue({ detectedType: 'Room/KSP failures', severity: 'high', likelyCause: 'Annotation processor mismatch or invalid schema/model.', likelyFiles: [], likelySymbols: [], message: normalizeMessage(line), suggestedFix: 'Verify Room entities/DAOs and KSP plugin/version alignment.', confidence: 0.82 }, 'Room/KSP failures');
    else if (composePattern.test(line))
      addIssue({ detectedType: 'Compose compiler issues', severity: 'medium', likelyCause: 'Compose compiler/runtime version mismatch or invalid composable usage.', likelyFiles: [], likelySymbols: [], message: normalizeMessage(line), suggestedFix: 'Align Compose compiler/runtime versions and review composable signatures.', confidence: 0.77 }, 'Compose compiler issues');
    else if (/task .* failed|execution failed for task|gradle.*failed/i.test(line))
      addIssue({ detectedType: 'Gradle task failures', severity: 'high', likelyCause: 'Task configuration or dependency failure.', likelyFiles: [], likelySymbols: [], message: normalizeMessage(line), suggestedFix: 'Inspect failing Gradle task stacktrace and resolve upstream config/deps.', confidence: 0.7 }, 'Gradle task failures');
    else if (/vite|electron|npm ERR!/i.test(line))
      addIssue({ detectedType: 'Electron/Vite/npm failures', severity: 'medium', likelyCause: 'Toolchain startup/build mismatch.', likelyFiles: [], likelySymbols: [], message: normalizeMessage(line), suggestedFix: 'Verify node modules, scripts, and dev/prod config consistency.', confidence: 0.75 }, 'Electron/Vite/npm failures');
    else if (/error\s+TS\d{4}|typescript.*error/i.test(line))
      addIssue({ detectedType: 'TypeScript error', severity: 'medium', likelyCause: 'Type mismatch or invalid syntax in TS/TSX source.', likelyFiles: [], likelySymbols: [], message: normalizeMessage(line), suggestedFix: 'Fix TS diagnostics and update types/interfaces.', confidence: 0.8 }, 'TypeScript error');
  }

  if (!issues.length) {
    return [{ detectedType: 'No known pattern', severity: 'low', likelyCause: 'Heuristics found no strong error signature.', likelyFiles: [], likelySymbols: [], suggestedFix: 'Review full log tail and re-run with verbose output.', confidence: 0.4 }];
  }

  const locScore = (i: BuildAnalysisResult) => (i.file ? 1 : 0) + (typeof i.line === 'number' ? 1 : 0) + (typeof i.column === 'number' ? 1 : 0);
  const severityScore = (s: string) => (s === 'high' ? 3 : s === 'medium' ? 2 : 1);

  return [...issues].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (locScore(b) !== locScore(a)) return locScore(b) - locScore(a);
    return severityScore(b.severity) - severityScore(a.severity);
  });
};

export const summarizeAnalysis = (results: BuildAnalysisResult[]): string => {
  const top = results[0];
  const location = top.file ? ` in ${top.file}${top.line ? ` at line ${top.line}` : ''}${top.column ? `, column ${top.column}` : ''}` : '';
  const symbol = top.likelySymbols[0] ? ` around symbol ${top.likelySymbols[0]}` : '';
  const message = top.message ? `: ${top.message}` : '';
  return `Likely ${top.detectedType.toLowerCase()}${location}${symbol}${message}.`;
};

export const deriveSystemStateFromAnalysis = (analysis: BuildAnalysisResult[]): SystemState => {
  if (analysis.some((item) => item.severity === 'high')) return 'error';
  if (analysis.some((item) => item.severity === 'medium')) return 'warning';
  return 'idle';
};

export const buildMemorySafetyBlock = (project: Project): string => {
  const mem = project.projectMemory;
  const protectedFiles = splitList(mem?.protectedFiles || '');
  const doNotRewrite = mem?.doNotRewriteRules || 'Do not rewrite working architecture.\nAvoid broad refactors.\nDo not modify protected files unless absolutely required.';
  const workflow = mem?.workflowNotes || '';
  return `Safety rules:
- Do not rewrite working architecture.
- Avoid broad refactors.
- Do not modify protected files unless absolutely required.
- Protected files: ${protectedFiles.join(', ') || 'None specified'}
- Do-not-rewrite rules: ${doNotRewrite}
- Workflow notes: ${workflow || 'None'}`;
};

export const detectProtectedFileHit = (project: Project, issue: BuildAnalysisResult): { hasHit: boolean; hits: string[] } => {
  const protectedFiles = splitList(project.projectMemory?.protectedFiles || '').map((f) => f.toLowerCase());
  const issueFiles = (issue.likelyFiles || []).map((f) => f.toLowerCase());
  const hits = issueFiles.filter((f) => protectedFiles.some((p) => f.includes(p) || p.includes(f)));
  return { hasHit: hits.length > 0, hits };
};

export const detectSafetyWarnings = (text: string, projectId = ''): SafetyWarning[] => {
  const warnings: SafetyWarning[] = [];
  const now = new Date().toISOString();
  const w = (message: string, severity: SafetyWarning['severity']) =>
    warnings.push({ id: crypto.randomUUID(), timestamp: now, projectId, message, severity });

  if (/rewrite entire|massive rewrite|rewrite whole/i.test(text)) w('Massive rewrite risk detected.', 'high');
  if (/delete|remove .*files|heavy refactor|large refactor/i.test(text)) w('Delete/refactor-heavy prompt risk detected.', 'high');
  if (/new architecture|re-architect|replace architecture/i.test(text)) w('Architecture drift risk detected.', 'medium');
  if (!/build|test/i.test(text)) w('Prompt may be missing build/test instructions.', 'medium');
  return warnings;
};

/** Pure version of findDuplicatePendingPrompt — takes `approvals` as a param instead of closing over state. */
export const findDuplicatePendingPrompt = (
  approvals: ApprovalItem[],
  projectId: string,
  chainId: string,
  promptType: 'Fix' | 'Validation' | 'Regression',
  issueType: string,
  contextKey: string,
): ApprovalItem | undefined =>
  approvals.find(
    (a) =>
      a.kind === 'prompt' &&
      a.status === 'pending' &&
      a.projectId === projectId &&
      (a.chainId || '') === chainId &&
      (a.promptType || 'Other') === promptType &&
      (a.issueType || '') === issueType &&
      (a.contextKey || '') === contextKey,
  );

export const groupApprovalsByChain = (approvals: ApprovalItem[]): Record<string, ApprovalItem[]> =>
  approvals.reduce<Record<string, ApprovalItem[]>>((acc, a) => {
    const key = a.chainId || `single-${a.id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});
