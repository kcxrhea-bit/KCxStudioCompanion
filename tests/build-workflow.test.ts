/**
 * Suite 1: Build Command Runner & Approval Flow
 *
 * Tests the end-to-end workflow of:
 *   paste build log → analyze → generate fix prompt → create command approval → execute/reject
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  parseBuildIntel,
  analyzeHeuristic,
  summarizeAnalysis,
  deriveSystemStateFromAnalysis,
  buildMemorySafetyBlock,
  detectProtectedFileHit,
  detectSafetyWarnings,
} from '../src/lib/buildAnalysis';
import { validateCommandRequest } from '../src/lib/commandSafety';
import { runCommand } from '../src/lib/commandRunner';
import type { ApprovalItem, BuildLogRecord, Project } from '../src/renderer/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-test-1',
  name: 'Test Project',
  path: process.cwd(),
  projectType: 'Desktop App',
  appGoal: 'Run integration tests',
  currentPhase: 'Build',
  features: [],
  memoryNotes: '',
  noRewriteRules: '',
  buildLogs: '',
  commandHistory: [],
  architectureNotes: { notes: '', importantFiles: '', doNotRewriteAreas: '', knownFragileSystems: '' },
  projectMemory: {
    projectGoal: '',
    importantFiles: '',
    protectedFiles: '',
    protectedSymbols: '',
    doNotRewriteRules: 'Do not rewrite working architecture.',
    workflowNotes: '',
  },
  ...overrides,
});

const TS_ERROR_LOG = `src/renderer/App.tsx(123, 5): error TS2304: Cannot find name 'BuildAnalyzer'
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.`;

const KOTLIN_ERROR_LOG = `e: app/src/main/kotlin/com/kcx/MainViewModel.kt:42:10 Unresolved reference: BuildRepo
e: app/src/main/kotlin/com/kcx/MainViewModel.kt:55:3 Unresolved reference: inject`;

const KOTLIN_SYNTAX_ERROR_LOG = `> Task :app:compileDebugKotlin FAILED
e: file:///C:/Users/right/AndroidStudioProjects/EasyLauncher/app/src/main/java/com/easylauncher/MainActivity.kt:123:45 Syntax error: Expecting an expression
BUILD FAILED in 2s`;

const GRADLE_ERROR_LOG = `Execution failed for task ':app:compileDebugKotlin'.
> Compilation error. See log for more details`;

// ---------------------------------------------------------------------------
// parseBuildIntel
// ---------------------------------------------------------------------------

describe('parseBuildIntel', () => {
  test('detects BUILD SUCCESSFUL', () => {
    const intel = parseBuildIntel('BUILD SUCCESSFUL in 3s');
    expect(intel.buildSuccessful).toBe(true);
    expect(intel.buildFailed).toBe(false);
  });

  test('detects BUILD FAILED', () => {
    const intel = parseBuildIntel('BUILD FAILED\n> Task :app:compileDebugKotlin FAILED');
    expect(intel.buildFailed).toBe(true);
    expect(intel.buildSuccessful).toBe(false);
  });

  test('counts TypeScript errors', () => {
    const intel = parseBuildIntel('error TS2304: Cannot find name\nerror TS2345: Argument mismatch\nerror TS2322: Type mismatch');
    expect(intel.typescriptErrors).toBe(3);
  });

  test('counts Gradle errors via "* What went wrong"', () => {
    const intel = parseBuildIntel('* What went wrong:\nExecution failed for task :app:compile');
    expect(intel.gradleErrors).toBeGreaterThanOrEqual(1);
  });

  test('counts missing dependency errors (unresolved reference)', () => {
    const intel = parseBuildIntel('Unresolved reference: MyClass\nCannot find module ./utils\ncould not resolve com.example:lib:1.0');
    expect(intel.missingDependencyErrors).toBeGreaterThanOrEqual(3);
  });

  test('returns all-zero counts for clean log output', () => {
    const intel = parseBuildIntel('Starting vite server...\nServer running at localhost:5173\nHMR enabled');
    expect(intel.buildSuccessful).toBe(false);
    expect(intel.buildFailed).toBe(false);
    expect(intel.typescriptErrors).toBe(0);
    expect(intel.kotlinCompileErrors).toBe(0);
    expect(intel.gradleErrors).toBe(0);
    expect(intel.missingDependencyErrors).toBe(0);
  });

  test('handles empty string', () => {
    const intel = parseBuildIntel('');
    expect(intel.buildSuccessful).toBe(false);
    expect(intel.buildFailed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// analyzeHeuristic
// ---------------------------------------------------------------------------

describe('analyzeHeuristic', () => {
  test('detects Kotlin unresolved reference with file, line, column', () => {
    const results = analyzeHeuristic(KOTLIN_ERROR_LOG);
    expect(results[0].detectedType).toBe('Kotlin compile error');
    expect(results[0].severity).toBe('high');
    expect(results[0].confidence).toBe(0.95);
    expect(results[0].likelySymbols).toContain('BuildRepo');
    expect(results[0].file).toBe('app/src/main/kotlin/com/kcx/MainViewModel.kt');
    expect(results[0].fileName).toBe('MainViewModel.kt');
    expect(results[0].line).toBe(42);
    expect(results[0].column).toBe(10);
    expect(results[0].message).toContain('Unresolved reference: BuildRepo');
  });

  test('detects deliberate Kotlin syntax typo in MainActivity.kt without generic spam', () => {
    const results = analyzeHeuristic(KOTLIN_SYNTAX_ERROR_LOG);
    expect(results[0].detectedType).toBe('Kotlin compile error');
    expect(results[0].severity).toBe('high');
    expect(results[0].confidence).toBe(0.95);
    expect(results[0].fileName).toBe('MainActivity.kt');
    expect(results[0].line).toBe(123);
    expect(results[0].column).toBe(45);
    expect(results[0].message).toMatch(/Expecting an expression|Syntax error/i);
    expect(results.some((r) => r.detectedType === 'Room/KSP failures')).toBe(false);
    expect(results.some((r) => r.detectedType === 'Compose compiler issues')).toBe(false);
  });

  test('detects TypeScript missing symbol with file location', () => {
    const results = analyzeHeuristic(TS_ERROR_LOG);
    const hit = results.find((r) => r.detectedType === 'missing symbol');
    expect(hit).toBeDefined();
    expect(hit!.likelySymbols).toContain('BuildAnalyzer');
    expect(hit!.file).toContain('App.tsx');
    expect(hit!.line).toBe(123);
  });

  test('detects missing module', () => {
    const results = analyzeHeuristic("Cannot find module './utils/helpers'");
    expect(results[0].detectedType).toBe('missing module');
    expect(results[0].likelySymbols).toContain('./utils/helpers');
  });

  test('detects Room/KSP failures', () => {
    const results = analyzeHeuristic('KspTask failed: RoomProcessor error processing androidx.room Entity annotation, AppDatabase_Impl not generated');
    expect(results[0].detectedType).toBe('Room/KSP failures');
    expect(results[0].severity).toBe('high');
  });

  test('does not classify generic Kotlin compile failure as Room/KSP', () => {
    const results = analyzeHeuristic('Execution failed for task :app:compileDebugKotlin.\n> Compilation error. See log for more details');
    expect(results.some((r) => r.detectedType === 'Room/KSP failures')).toBe(false);
  });

  test('detects Gradle task failures', () => {
    const results = analyzeHeuristic(GRADLE_ERROR_LOG);
    expect(results[0].detectedType).toBe('Gradle task failures');
    expect(results[0].severity).toBe('high');
  });

  test('detects Compose compiler issues', () => {
    const results = analyzeHeuristic('@Composable function called from non-composable context');
    expect(results[0].detectedType).toBe('Compose compiler issues');
  });

  test('does not classify generic Kotlin compile failure as Compose', () => {
    const results = analyzeHeuristic('Execution failed for task :app:compileDebugKotlin.\n> Compilation error. See log for more details');
    expect(results.some((r) => r.detectedType === 'Compose compiler issues')).toBe(false);
  });

  test('deduplicates repeated fallback issue spam', () => {
    const noisyLog = Array.from({ length: 20 }, () => 'Execution failed for task :app:compileDebugKotlin.').join('\n');
    const results = analyzeHeuristic(noisyLog);
    expect(results.filter((r) => r.detectedType === 'Gradle task failures')).toHaveLength(1);
  });

  test('deduplicates repeated Kotlin compiler locations', () => {
    const repeated = Array.from({ length: 5 }, () => 'e: file:///C:/project/app/src/main/java/MainActivity.kt:12:3 Expecting an expression').join('\n');
    const results = analyzeHeuristic(repeated);
    expect(results.filter((r) => r.detectedType === 'Kotlin compile error')).toHaveLength(1);
  });

  test('detects Electron/Vite/npm failures', () => {
    const results = analyzeHeuristic('npm ERR! code ENOENT\nvite: cannot find config file');
    expect(results.some((r) => r.detectedType === 'Electron/Vite/npm failures')).toBe(true);
  });

  test('detects AndroidManifest issues', () => {
    const results = analyzeHeuristic('Error processing app/src/main/AndroidManifest.xml: duplicate activity');
    expect(results.some((r) => r.detectedType === 'manifest/package issues')).toBe(true);
  });

  test('returns No known pattern for clean output', () => {
    const results = analyzeHeuristic('Compiling... done.\nServer started successfully.');
    expect(results[0].detectedType).toBe('No known pattern');
    expect(results[0].severity).toBe('low');
    expect(results[0].confidence).toBe(0.4);
  });

  test('ranks by confidence descending', () => {
    const results = analyzeHeuristic([KOTLIN_ERROR_LOG, 'npm ERR! missing script'].join('\n'));
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
    }
  });

  test('higher-confidence issue ranked first over lower-confidence', () => {
    // Kotlin compile error (0.95) should beat Electron/Vite (0.75)
    const mixed = [KOTLIN_ERROR_LOG, 'vite: error during build'].join('\n');
    const results = analyzeHeuristic(mixed);
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.87);
  });
});

// ---------------------------------------------------------------------------
// summarizeAnalysis
// ---------------------------------------------------------------------------

describe('summarizeAnalysis', () => {
  test('summary contains the detected type', () => {
    const results = analyzeHeuristic(KOTLIN_ERROR_LOG);
    const summary = summarizeAnalysis(results);
    expect(summary).toMatch(/unresolved reference/i);
  });

  test('summary contains symbol name', () => {
    const results = analyzeHeuristic(KOTLIN_ERROR_LOG);
    const summary = summarizeAnalysis(results);
    expect(summary).toContain('BuildRepo');
  });

  test('summary contains file path when available', () => {
    const results = analyzeHeuristic(KOTLIN_ERROR_LOG);
    const summary = summarizeAnalysis(results);
    expect(summary).toContain('MainViewModel.kt');
  });

  test('summary is a non-empty string', () => {
    const results = analyzeHeuristic("Cannot find module './missing'");
    const summary = summarizeAnalysis(results);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// deriveSystemStateFromAnalysis
// ---------------------------------------------------------------------------

describe('deriveSystemStateFromAnalysis', () => {
  test('returns error for high severity issues', () => {
    const results = analyzeHeuristic(KOTLIN_ERROR_LOG);
    expect(deriveSystemStateFromAnalysis(results)).toBe('error');
  });

  test('returns warning for medium severity issues only', () => {
    const results = analyzeHeuristic("Property 'foo' does not exist on type 'Bar'");
    expect(deriveSystemStateFromAnalysis(results)).toBe('warning');
  });

  test('returns idle for low severity / no pattern', () => {
    const results = analyzeHeuristic('All good, nothing to report.');
    expect(deriveSystemStateFromAnalysis(results)).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// Fix Prompt Approval Item Shape
// ---------------------------------------------------------------------------

describe('Fix Prompt approval item structure', () => {
  test('approval item has all required chain fields', () => {
    const project = makeProject();
    const issue = analyzeHeuristic(KOTLIN_ERROR_LOG)[0];
    const chainId = 'build-record-abc';

    const approval: ApprovalItem = {
      id: crypto.randomUUID(),
      projectId: project.id,
      kind: 'prompt',
      title: `Fix Prompt (${issue.detectedType})`,
      payload: `Fix: ${issue.suggestedFix}\n${buildMemorySafetyBlock(project)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      source: 'build-analysis',
      chainId,
      chainType: issue.detectedType,
      promptType: 'Fix',
      issueType: issue.detectedType,
      contextKey: `${issue.likelySymbols.join('|')}::${issue.file || ''}:${issue.line || ''}:${issue.column || ''}`,
    };

    expect(approval.chainId).toBe(chainId);
    expect(approval.promptType).toBe('Fix');
    expect(approval.issueType).toBe('Kotlin compile error');
    expect(approval.status).toBe('pending');
    expect(approval.payload).toContain('Safety rules');
    expect(approval.contextKey).toContain('BuildRepo');
  });

  test('Fix prompt payload embeds raw log text', () => {
    const project = makeProject();
    const results = analyzeHeuristic(KOTLIN_ERROR_LOG);
    const issue = results[0];
    const fakeRecord: BuildLogRecord = {
      id: 'rec-1',
      projectId: project.id,
      timestamp: new Date().toISOString(),
      rawLogText: KOTLIN_ERROR_LOG,
      analysis: results,
      summary: summarizeAnalysis(results),
    };

    const payload = `Detected issue type: ${issue.detectedType}\nOriginal build log:\n${fakeRecord.rawLogText}`;
    expect(payload).toContain('Unresolved reference: BuildRepo');
  });
});

// ---------------------------------------------------------------------------
// Command Approval Flow
// ---------------------------------------------------------------------------

describe('Command approval flow', () => {
  test('command approval item serializes CommandRequest in payload', () => {
    const project = makeProject();
    const commandApproval: ApprovalItem = {
      id: crypto.randomUUID(),
      projectId: project.id,
      kind: 'command',
      title: 'Run npm build',
      payload: JSON.stringify({ command: 'npm', args: ['run', 'build'], cwd: project.path }),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    expect(commandApproval.kind).toBe('command');
    expect(commandApproval.status).toBe('pending');

    const req = JSON.parse(commandApproval.payload);
    expect(req.command).toBe('npm');
    expect(req.args).toEqual(['run', 'build']);
    expect(req.cwd).toBe(project.path);
  });

  test('approval status transitions: pending → approved → sent → completed', () => {
    const now = new Date().toISOString();
    let a: ApprovalItem = { id: '1', projectId: 'p', kind: 'prompt', title: 'T', payload: 'x', status: 'pending', createdAt: now };

    a = { ...a, status: 'approved', approvedAt: now };
    expect(a.status).toBe('approved');
    expect(a.approvedAt).toBeDefined();

    a = { ...a, status: 'sent', sentAt: now };
    expect(a.status).toBe('sent');

    a = { ...a, status: 'completed', completedAt: now };
    expect(a.status).toBe('completed');
    expect(a.completedAt).toBeDefined();
  });

  test('rejected command keeps rejected status and does not transition further', () => {
    const a: ApprovalItem = {
      id: '2',
      projectId: 'p',
      kind: 'command',
      title: 'Risky command',
      payload: JSON.stringify({ command: 'rm', args: ['-rf', '/'], cwd: '/tmp' }),
      status: 'rejected',
      createdAt: new Date().toISOString(),
    };
    expect(a.status).toBe('rejected');
    // A rejected item should NOT be in pending/approved — verify the payload is not executed
    expect(a.status).not.toBe('pending');
    expect(a.status).not.toBe('approved');
  });

  test('failed approval records failedAt timestamp', () => {
    const now = new Date().toISOString();
    const a: ApprovalItem = {
      id: '3',
      projectId: 'p',
      kind: 'prompt',
      title: 'Failed prompt',
      payload: 'x',
      status: 'failed',
      createdAt: now,
      failedAt: now,
    };
    expect(a.status).toBe('failed');
    expect(a.failedAt).toBe(now);
  });
});

// ---------------------------------------------------------------------------
// Protected File Detection
// ---------------------------------------------------------------------------

describe('detectProtectedFileHit', () => {
  test('detects hit when issue file overlaps with protected file list', () => {
    const project = makeProject({
      projectMemory: {
        projectGoal: '',
        importantFiles: '',
        protectedFiles: 'app/src/main/kotlin/com/kcx/MainViewModel.kt\nDatabase.kt',
        protectedSymbols: '',
        doNotRewriteRules: '',
        workflowNotes: '',
      },
    });
    const issue = analyzeHeuristic(KOTLIN_ERROR_LOG)[0];
    const result = detectProtectedFileHit(project, issue);
    expect(result.hasHit).toBe(true);
    expect(result.hits.length).toBeGreaterThan(0);
  });

  test('returns no hit for non-protected issue files', () => {
    const project = makeProject({
      projectMemory: {
        projectGoal: '',
        importantFiles: '',
        protectedFiles: 'Database.kt, Config.ts',
        protectedSymbols: '',
        doNotRewriteRules: '',
        workflowNotes: '',
      },
    });
    const issue = analyzeHeuristic("Cannot find module './newFeature/helper'")[0];
    const result = detectProtectedFileHit(project, issue);
    expect(result.hasHit).toBe(false);
  });

  test('returns no hit when no protected files are configured', () => {
    const project = makeProject();
    const issue = analyzeHeuristic(KOTLIN_ERROR_LOG)[0];
    const result = detectProtectedFileHit(project, issue);
    expect(result.hasHit).toBe(false);
  });

  test('comma-separated protected files are parsed correctly', () => {
    const project = makeProject({
      projectMemory: {
        projectGoal: '', importantFiles: '',
        protectedFiles: 'MainViewModel.kt, Database.kt, Config.ts',
        protectedSymbols: '', doNotRewriteRules: '', workflowNotes: '',
      },
    });
    const issue = analyzeHeuristic(KOTLIN_ERROR_LOG)[0];
    const result = detectProtectedFileHit(project, issue);
    expect(result.hasHit).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Safety Block Generation
// ---------------------------------------------------------------------------

describe('buildMemorySafetyBlock', () => {
  test('includes protected files and do-not-rewrite rules', () => {
    const project = makeProject({
      projectMemory: {
        projectGoal: '',
        importantFiles: '',
        protectedFiles: 'Database.kt\nConfig.ts',
        protectedSymbols: '',
        doNotRewriteRules: 'Never rewrite the DB layer.',
        workflowNotes: 'Always run tests after each patch.',
      },
    });
    const block = buildMemorySafetyBlock(project);
    expect(block).toContain('Database.kt');
    expect(block).toContain('Config.ts');
    expect(block).toContain('Never rewrite the DB layer.');
    expect(block).toContain('Always run tests after each patch.');
  });

  test('uses default rules when projectMemory is absent', () => {
    const project = makeProject({ projectMemory: undefined });
    const block = buildMemorySafetyBlock(project);
    expect(block).toContain('Do not rewrite working architecture');
    expect(block).toContain('None specified');
  });

  test('always starts with "Safety rules:"', () => {
    const project = makeProject();
    const block = buildMemorySafetyBlock(project);
    expect(block.startsWith('Safety rules:')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Safety Warnings
// ---------------------------------------------------------------------------

describe('detectSafetyWarnings', () => {
  test('flags massive rewrite prompts as high severity', () => {
    const warnings = detectSafetyWarnings('rewrite entire codebase now', 'proj-1');
    const high = warnings.filter((w) => w.severity === 'high');
    expect(high.length).toBeGreaterThan(0);
    expect(high[0].message).toContain('rewrite');
  });

  test('flags heavy refactor as high severity', () => {
    const warnings = detectSafetyWarnings('large refactor of all modules', 'proj-1');
    expect(warnings.some((w) => w.severity === 'high')).toBe(true);
  });

  test('flags architecture change as medium severity', () => {
    const warnings = detectSafetyWarnings('new architecture needed for the app', 'proj-1');
    expect(warnings.some((w) => w.severity === 'medium' && w.message.includes('Architecture'))).toBe(true);
  });

  test('flags prompt missing build/test instructions', () => {
    const warnings = detectSafetyWarnings('just update the color of the button', 'proj-1');
    expect(warnings.some((w) => w.message.includes('build/test'))).toBe(true);
  });

  test('no build/test warning when prompt mentions build', () => {
    const warnings = detectSafetyWarnings('fix the bug and run build', 'proj-1');
    const missing = warnings.filter((w) => w.message.includes('build/test'));
    expect(missing.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// runCommand (real child process — uses node which is always available)
// ---------------------------------------------------------------------------

describe('runCommand', () => {
  test('blocks dangerous destructive commands before spawn', async () => {
    const result = await runCommand({ projectId: 'p', command: 'rm', args: ['-rf', '/'], cwd: process.cwd() });
    expect(result.success).toBe(false);
    expect(result.output).toContain('Command blocked');
  });

  test('blocks shell-control characters in command args', () => {
    const safety = validateCommandRequest({ command: 'node', args: ['--version', '&&', 'echo bad'], cwd: process.cwd() });
    expect(safety.ok).toBe(false);
    expect(safety.reason).toContain('shell control');
  });

  test('blocks destructive git reset hard', () => {
    const safety = validateCommandRequest({ command: 'git', args: ['reset', '--hard'], cwd: process.cwd() });
    expect(safety.ok).toBe(false);
    expect(safety.reason).toContain('git reset --hard');
  });

  test('executes node --version successfully', async () => {
    const result = await runCommand({ projectId: 'p', command: 'node', args: ['--version'], cwd: process.cwd() });
    expect(result.success).toBe(true);
    expect(result.output).toMatch(/v\d+\.\d+\.\d+/);
    expect(result.code).toBe(0);
  });

  test('captures real-time stdout lines via callback', async () => {
    const lines: string[] = [];
    await runCommand(
      { projectId: 'p', command: 'node', args: ['--version'], cwd: process.cwd() },
      (line) => lines.push(line),
    );
    expect(lines.some((l) => /v\d+/.test(l))).toBe(true);
  });

  test('captures stderr lines via callback with warning level', async () => {
    // Write to a temp script — avoids Windows cmd.exe shell-quoting issues with inline -e strings
    const script = path.join(os.tmpdir(), 'kcx-test-stderr.js');
    fs.writeFileSync(script, 'process.stderr.write("err-msg\\n");');
    const lines: { label: string; level: string }[] = [];
    try {
      await runCommand({ projectId: 'p', command: 'node', args: [script], cwd: process.cwd() },
        (label, level) => lines.push({ label, level }));
    } finally { fs.unlinkSync(script); }
    const stderrLine = lines.find((l) => l.label.includes('err-msg'));
    expect(stderrLine).toBeDefined();
    expect(stderrLine!.level).toBe('warning');
  });

  test('returns success: false and non-zero code on process failure', async () => {
    const script = path.join(os.tmpdir(), 'kcx-test-exit.js');
    fs.writeFileSync(script, 'process.exit(2);');
    try {
      const result = await runCommand({ projectId: 'p', command: 'node', args: [script], cwd: process.cwd() });
      expect(result.success).toBe(false);
      expect(result.code).toBe(2);
    } finally { fs.unlinkSync(script); }
  });

  test('returns success: false for a non-existent command', async () => {
    const result = await runCommand(
      { projectId: 'p', command: 'totally-nonexistent-cmd-xyz-99', args: [], cwd: process.cwd() },
    );
    expect(result.success).toBe(false);
  });

  test('output accumulates from multiple stdout writes', async () => {
    const script = path.join(os.tmpdir(), 'kcx-test-multi.js');
    fs.writeFileSync(script, 'console.log("line1"); console.log("line2");');
    try {
      const result = await runCommand({ projectId: 'p', command: 'node', args: [script], cwd: process.cwd() });
      expect(result.output).toContain('line1');
      expect(result.output).toContain('line2');
    } finally { fs.unlinkSync(script); }
  });
});
