/**
 * Suite 4: Prompt Chain Grouping
 *
 * Verifies that Fix → Validation → Regression prompts share a chainId,
 * are grouped correctly, and chain status badges reflect item states.
 * Also exercises the patch review analyzer as part of the workflow.
 */

import { groupApprovalsByChain, findDuplicatePendingPrompt, analyzeHeuristic } from '../src/lib/buildAnalysis';
import { analyzePatchReview } from '../src/lib/patchReview';
import type { ApprovalItem } from '../src/renderer/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHAIN_ID = 'chain-build-xyz-001';
const PROJ = 'proj-chain-test';
const ISSUE = 'unresolved reference';
const CTX = 'BuildRepo::app/src/main/kotlin/com/kcx/MainViewModel.kt:42:10';

const makeChainItem = (
  promptType: 'Fix' | 'Validation' | 'Regression',
  id: string,
  status: ApprovalItem['status'] = 'pending',
): ApprovalItem => ({
  id,
  projectId: PROJ,
  kind: 'prompt',
  title: `${promptType} Prompt (${ISSUE})`,
  payload: `${promptType} prompt content for ${ISSUE}`,
  status,
  createdAt: new Date().toISOString(),
  source: 'build-analysis',
  chainId: CHAIN_ID,
  chainType: ISSUE,
  promptType,
  issueType: ISSUE,
  contextKey: CTX,
});

const fix = makeChainItem('Fix', 'fix-1');
const validation = makeChainItem('Validation', 'val-1');
const regression = makeChainItem('Regression', 'reg-1');
const allThree = [fix, validation, regression];

// ---------------------------------------------------------------------------
// Chain ID linking
// ---------------------------------------------------------------------------

describe('Prompt chain — chainId linking', () => {
  test('Fix, Validation, Regression all share the same chainId', () => {
    expect(fix.chainId).toBe(CHAIN_ID);
    expect(validation.chainId).toBe(CHAIN_ID);
    expect(regression.chainId).toBe(CHAIN_ID);
  });

  test('chain is derived from the BuildLogRecord id', () => {
    // Simulate how App.tsx derives chainId: it uses the buildLogRecord.id
    const fakeRecordId = 'build-log-record-123';
    const approval: ApprovalItem = {
      ...fix,
      chainId: fakeRecordId,
    };
    expect(approval.chainId).toBe(fakeRecordId);
  });

  test('each prompt type is stored on the ApprovalItem', () => {
    expect(fix.promptType).toBe('Fix');
    expect(validation.promptType).toBe('Validation');
    expect(regression.promptType).toBe('Regression');
  });

  test('all three items share the same issueType and contextKey', () => {
    for (const item of allThree) {
      expect(item.issueType).toBe(ISSUE);
      expect(item.contextKey).toBe(CTX);
    }
  });
});

// ---------------------------------------------------------------------------
// groupApprovalsByChain
// ---------------------------------------------------------------------------

describe('groupApprovalsByChain', () => {
  test('groups all three prompt types under one chainId key', () => {
    const groups = groupApprovalsByChain(allThree);
    expect(Object.keys(groups)).toHaveLength(1);
    expect(groups[CHAIN_ID]).toHaveLength(3);
  });

  test('group contains Fix, Validation, and Regression promptTypes', () => {
    const groups = groupApprovalsByChain(allThree);
    const types = groups[CHAIN_ID].map((item) => item.promptType);
    expect(types).toContain('Fix');
    expect(types).toContain('Validation');
    expect(types).toContain('Regression');
  });

  test('separate chains are in separate group keys', () => {
    const chain2: ApprovalItem = {
      ...makeChainItem('Fix', 'fix-chain2'),
      chainId: 'chain-build-xyz-002',
    };
    const groups = groupApprovalsByChain([...allThree, chain2]);
    expect(Object.keys(groups)).toHaveLength(2);
    expect(groups[CHAIN_ID]).toHaveLength(3);
    expect(groups['chain-build-xyz-002']).toHaveLength(1);
  });

  test('approval without chainId gets a single-item group with key prefixed "single-"', () => {
    const standalone: ApprovalItem = {
      id: 'standalone-abc',
      projectId: PROJ,
      kind: 'prompt',
      title: 'Manual Prompt',
      payload: 'some prompt',
      status: 'pending',
      createdAt: new Date().toISOString(),
      // no chainId
    };
    const groups = groupApprovalsByChain([standalone]);
    const keys = Object.keys(groups);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^single-/);
    expect(groups[keys[0]]).toHaveLength(1);
  });

  test('mixed chained and standalone items are separated correctly', () => {
    const standalone: ApprovalItem = {
      id: 'manual-1',
      projectId: PROJ,
      kind: 'prompt',
      title: 'Manual',
      payload: 'x',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const groups = groupApprovalsByChain([...allThree, standalone]);
    expect(Object.keys(groups)).toHaveLength(2);
  });

  test('empty approvals list returns empty groups', () => {
    const groups = groupApprovalsByChain([]);
    expect(Object.keys(groups)).toHaveLength(0);
  });

  test('preserves all items when grouping', () => {
    const groups = groupApprovalsByChain(allThree);
    const allItems = Object.values(groups).flat();
    expect(allItems).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Chain status badge (mirrors App.tsx: chainFailed ? "Risk" : "Stable")
// ---------------------------------------------------------------------------

describe('Chain status badge logic', () => {
  const getBadge = (items: ApprovalItem[]) => {
    const chainFailed = items.filter((x) => x.status === 'failed').length;
    return chainFailed ? 'Risk' : 'Stable';
  };

  test('Stable when all items are pending', () => {
    expect(getBadge(allThree)).toBe('Stable');
  });

  test('Risk when at least one item has failed', () => {
    const withFailed = allThree.map((item, i) =>
      i === 0 ? { ...item, status: 'failed' as const } : item,
    );
    expect(getBadge(withFailed)).toBe('Risk');
  });

  test('Stable when all items are completed', () => {
    const allCompleted = allThree.map((item) => ({ ...item, status: 'completed' as const }));
    expect(getBadge(allCompleted)).toBe('Stable');
  });

  test('Stable when all items are sent', () => {
    const allSent = allThree.map((item) => ({ ...item, status: 'sent' as const }));
    expect(getBadge(allSent)).toBe('Stable');
  });

  test('Risk when regression failed but fix and validation are fine', () => {
    const partialFail = [
      makeChainItem('Fix', 'f', 'completed'),
      makeChainItem('Validation', 'v', 'sent'),
      makeChainItem('Regression', 'r', 'failed'),
    ];
    expect(getBadge(partialFail)).toBe('Risk');
  });
});

// ---------------------------------------------------------------------------
// Duplicate prevention within chains
// ---------------------------------------------------------------------------

describe('Duplicate prevention — chain context', () => {
  test('Fix cannot be duplicated when already pending in the chain', () => {
    const dup = findDuplicatePendingPrompt(allThree, PROJ, CHAIN_ID, 'Fix', ISSUE, CTX);
    expect(dup).toBeDefined();
    expect(dup!.promptType).toBe('Fix');
  });

  test('Validation cannot be duplicated when already pending in the chain', () => {
    const dup = findDuplicatePendingPrompt(allThree, PROJ, CHAIN_ID, 'Validation', ISSUE, CTX);
    expect(dup).toBeDefined();
    expect(dup!.promptType).toBe('Validation');
  });

  test('Regression cannot be duplicated when already pending in the chain', () => {
    const dup = findDuplicatePendingPrompt(allThree, PROJ, CHAIN_ID, 'Regression', ISSUE, CTX);
    expect(dup).toBeDefined();
    expect(dup!.promptType).toBe('Regression');
  });

  test('Fix CAN be added if only Validation and Regression exist', () => {
    const dup = findDuplicatePendingPrompt([validation, regression], PROJ, CHAIN_ID, 'Fix', ISSUE, CTX);
    expect(dup).toBeUndefined();
  });

  test('Validation CAN be added if only Fix and Regression exist', () => {
    const dup = findDuplicatePendingPrompt([fix, regression], PROJ, CHAIN_ID, 'Validation', ISSUE, CTX);
    expect(dup).toBeUndefined();
  });

  test('after Fix is sent, a new Fix can be queued (sent is not pending)', () => {
    const sentFix = makeChainItem('Fix', 'fix-sent', 'sent');
    const dup = findDuplicatePendingPrompt([sentFix, validation, regression], PROJ, CHAIN_ID, 'Fix', ISSUE, CTX);
    expect(dup).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Patch review analyzer (end-of-workflow)
// ---------------------------------------------------------------------------

describe('analyzePatchReview — patch review workflow', () => {
  test('returns null for empty input', () => {
    expect(analyzePatchReview('', PROJ)).toBeNull();
    expect(analyzePatchReview('   ', PROJ)).toBeNull();
  });

  test('detects changed TypeScript and Kotlin files', () => {
    const raw = 'Modified files: src/renderer/App.tsx, src/main/main.ts, app/src/main/kotlin/Main.kt';
    const review = analyzePatchReview(raw, PROJ)!;
    expect(review.filesChanged.some((f) => f.includes('App.tsx'))).toBe(true);
    expect(review.filesChanged.some((f) => f.includes('Main.kt'))).toBe(true);
  });

  test('detects build successful outcome', () => {
    const review = analyzePatchReview('BUILD SUCCESSFUL in 2s. All tests passed.', PROJ)!;
    expect(review.buildOutcome).toBe('success');
    expect(review.recommendedNextStep).toContain('regression prompt');
  });

  test('detects build failed outcome', () => {
    const review = analyzePatchReview('BUILD FAILED\nerror TS2304: Cannot find name Foo', PROJ)!;
    expect(review.buildOutcome).toBe('failure');
  });

  test('unknown outcome when no build signal present', () => {
    const review = analyzePatchReview('Changed some files and updated logic.', PROJ)!;
    expect(review.buildOutcome).toBe('unknown');
  });

  test('low risk for clean summary', () => {
    const review = analyzePatchReview('Updated button color in UI. BUILD SUCCESSFUL.', PROJ)!;
    expect(review.riskLevel).toBe('low');
    expect(review.riskyPhrases).toHaveLength(0);
  });

  test('medium risk for single risky phrase', () => {
    const review = analyzePatchReview('Large refactor of the auth module. BUILD SUCCESSFUL.', PROJ)!;
    expect(review.riskLevel).toBe('medium');
    expect(review.riskyPhrases).toContain('refactor');
  });

  test('high risk for multiple risky phrases', () => {
    const review = analyzePatchReview(
      'Full rewrite of the module. Large cleanup. Architecture change applied.',
      PROJ,
    )!;
    expect(review.riskLevel).toBe('high');
    expect(review.riskyPhrases.length).toBeGreaterThan(1);
  });

  test('recommends Fix + Validation prompts for unresolved reference failures', () => {
    const review = analyzePatchReview(
      'BUILD FAILED: unresolved reference BuildRepo in MainViewModel.kt',
      PROJ,
    )!;
    expect(review.recommendedNextStep).toContain('fix');
  });

  test('recommends TS build re-run for TypeScript failures', () => {
    const review = analyzePatchReview(
      'error: typescript cannot find name. BUILD FAILED.',
      PROJ,
    )!;
    expect(review.recommendedNextStep).toContain('TS build');
  });

  test('recommends clean/rebuild for Room/KSP failures', () => {
    const review = analyzePatchReview('BUILD FAILED: ksp processing error in Room entity', PROJ)!;
    expect(review.recommendedNextStep).toContain('Clean/rebuild');
  });

  test('result is linked to the correct project', () => {
    const review = analyzePatchReview('Updated App.tsx. BUILD SUCCESSFUL.', PROJ)!;
    expect(review.projectId).toBe(PROJ);
  });

  test('result has a valid timestamp', () => {
    const review = analyzePatchReview('Updated logic.', PROJ)!;
    expect(() => new Date(review.timestamp)).not.toThrow();
    expect(review.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('result has a non-empty UUID id', () => {
    const review = analyzePatchReview('Updated logic.', PROJ)!;
    expect(typeof review.id).toBe('string');
    expect(review.id.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Full chain workflow simulation
// ---------------------------------------------------------------------------

describe('Full chain workflow integration', () => {
  test('simulates: analyze log → create chain → group approvals → check status', () => {
    const buildLog = 'e: app/src/main/kotlin/com/kcx/MainViewModel.kt:42:10 Unresolved reference: BuildRepo';
    const analysis = analyzeHeuristic(buildLog);
    const issue = analysis[0];

    // 1. chainId comes from the build log record id
    const chainId = 'build-record-simulate-001';

    // 2. All three prompt types share this chainId
    const approvals: ApprovalItem[] = [
      { ...makeChainItem('Fix', 'f'), chainId, issueType: issue.detectedType },
      { ...makeChainItem('Validation', 'v'), chainId, issueType: issue.detectedType },
      { ...makeChainItem('Regression', 'r'), chainId, issueType: issue.detectedType },
    ];

    // 3. Group them
    const groups = groupApprovalsByChain(approvals);
    expect(Object.keys(groups)).toHaveLength(1);
    const chainItems = groups[chainId];
    expect(chainItems).toHaveLength(3);

    // 4. Chain is Stable (all pending — none failed)
    const chainFailed = chainItems.filter((x) => x.status === 'failed').length;
    expect(chainFailed ? 'Risk' : 'Stable').toBe('Stable');

    // 5. Trying to add a second Fix is blocked
    const dup = findDuplicatePendingPrompt(approvals, PROJ, chainId, 'Fix', issue.detectedType, CTX);
    expect(dup).toBeDefined();

    // 6. After the Fix is sent, a new Fix can be queued
    const updatedApprovals = approvals.map((a) =>
      a.id === 'f' ? { ...a, status: 'sent' as const } : a,
    );
    const noDup = findDuplicatePendingPrompt(updatedApprovals, PROJ, chainId, 'Fix', issue.detectedType, CTX);
    expect(noDup).toBeUndefined();
  });
});
