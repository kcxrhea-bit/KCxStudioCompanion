/**
 * Suite 2: Duplicate Prompt Prevention
 *
 * Verifies that findDuplicatePendingPrompt correctly blocks duplicate
 * Fix/Validation/Regression prompts while allowing legitimate new entries.
 */

import { findDuplicatePendingPrompt } from '../src/lib/buildAnalysis';
import type { ApprovalItem } from '../src/renderer/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJ = 'proj-abc';
const CHAIN = 'chain-build-001';
const ISSUE = 'unresolved reference';
const CTX = 'BuildRepo::app/src/main/kotlin/com/kcx/MainViewModel.kt:42:10';

const makeApproval = (overrides: Partial<ApprovalItem> = {}): ApprovalItem => ({
  id: crypto.randomUUID(),
  projectId: PROJ,
  kind: 'prompt',
  title: 'Fix Prompt (unresolved reference)',
  payload: 'fix the issue',
  status: 'pending',
  createdAt: new Date().toISOString(),
  source: 'build-analysis',
  chainId: CHAIN,
  chainType: ISSUE,
  promptType: 'Fix',
  issueType: ISSUE,
  contextKey: CTX,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Core duplicate detection
// ---------------------------------------------------------------------------

describe('findDuplicatePendingPrompt — core detection', () => {
  test('detects exact duplicate (same project, chain, type, issue, context)', () => {
    const existing: ApprovalItem[] = [makeApproval({ id: 'original-fix' })];
    const dup = findDuplicatePendingPrompt(existing, PROJ, CHAIN, 'Fix', ISSUE, CTX);
    expect(dup).toBeDefined();
    expect(dup!.id).toBe('original-fix');
  });

  test('returns the matching item (not just truthy)', () => {
    const existing: ApprovalItem[] = [
      makeApproval({ id: 'first', promptType: 'Validation' }),
      makeApproval({ id: 'second', promptType: 'Fix' }),
    ];
    const dup = findDuplicatePendingPrompt(existing, PROJ, CHAIN, 'Fix', ISSUE, CTX);
    expect(dup!.id).toBe('second');
  });

  test('handles empty approvals list — no duplicate', () => {
    const dup = findDuplicatePendingPrompt([], PROJ, CHAIN, 'Fix', ISSUE, CTX);
    expect(dup).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Prompt type differentiation
// ---------------------------------------------------------------------------

describe('findDuplicatePendingPrompt — prompt type differentiation', () => {
  const existingFix: ApprovalItem[] = [makeApproval({ id: 'fix-1', promptType: 'Fix' })];

  test('Fix is detected as duplicate when Fix already pending', () => {
    expect(findDuplicatePendingPrompt(existingFix, PROJ, CHAIN, 'Fix', ISSUE, CTX)).toBeDefined();
  });

  test('Validation is NOT a duplicate when only Fix exists', () => {
    expect(findDuplicatePendingPrompt(existingFix, PROJ, CHAIN, 'Validation', ISSUE, CTX)).toBeUndefined();
  });

  test('Regression is NOT a duplicate when only Fix exists', () => {
    expect(findDuplicatePendingPrompt(existingFix, PROJ, CHAIN, 'Regression', ISSUE, CTX)).toBeUndefined();
  });

  test('all three types pending independently does not block each other', () => {
    const allThree: ApprovalItem[] = [
      makeApproval({ id: 'f', promptType: 'Fix' }),
      makeApproval({ id: 'v', promptType: 'Validation' }),
      makeApproval({ id: 'r', promptType: 'Regression' }),
    ];
    // Each type finds its own duplicate
    expect(findDuplicatePendingPrompt(allThree, PROJ, CHAIN, 'Fix', ISSUE, CTX)!.id).toBe('f');
    expect(findDuplicatePendingPrompt(allThree, PROJ, CHAIN, 'Validation', ISSUE, CTX)!.id).toBe('v');
    expect(findDuplicatePendingPrompt(allThree, PROJ, CHAIN, 'Regression', ISSUE, CTX)!.id).toBe('r');
  });
});

// ---------------------------------------------------------------------------
// Context key differentiation
// ---------------------------------------------------------------------------

describe('findDuplicatePendingPrompt — contextKey differentiation', () => {
  const existing: ApprovalItem[] = [makeApproval({ id: 'ctx-1', contextKey: CTX })];

  test('same type with different contextKey is NOT a duplicate', () => {
    const differentCtx = 'OtherClass::src/Other.kt:99:1';
    expect(findDuplicatePendingPrompt(existing, PROJ, CHAIN, 'Fix', ISSUE, differentCtx)).toBeUndefined();
  });

  test('same type with identical contextKey IS a duplicate', () => {
    expect(findDuplicatePendingPrompt(existing, PROJ, CHAIN, 'Fix', ISSUE, CTX)).toBeDefined();
  });

  test('empty contextKey matches only empty contextKey', () => {
    const noCtx: ApprovalItem[] = [makeApproval({ id: 'no-ctx', contextKey: '' })];
    expect(findDuplicatePendingPrompt(noCtx, PROJ, CHAIN, 'Fix', ISSUE, '')).toBeDefined();
    expect(findDuplicatePendingPrompt(noCtx, PROJ, CHAIN, 'Fix', ISSUE, CTX)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Chain ID differentiation
// ---------------------------------------------------------------------------

describe('findDuplicatePendingPrompt — chainId differentiation', () => {
  const existing: ApprovalItem[] = [makeApproval({ id: 'chain-1', chainId: CHAIN })];

  test('same type on different chainId is NOT a duplicate', () => {
    expect(findDuplicatePendingPrompt(existing, PROJ, 'chain-build-002', 'Fix', ISSUE, CTX)).toBeUndefined();
  });

  test('same type on same chainId IS a duplicate', () => {
    expect(findDuplicatePendingPrompt(existing, PROJ, CHAIN, 'Fix', ISSUE, CTX)).toBeDefined();
  });

  test('approval with no chainId only matches when searching empty chainId', () => {
    const noChain: ApprovalItem[] = [makeApproval({ id: 'no-chain', chainId: undefined })];
    expect(findDuplicatePendingPrompt(noChain, PROJ, '', 'Fix', ISSUE, CTX)).toBeDefined();
    expect(findDuplicatePendingPrompt(noChain, PROJ, CHAIN, 'Fix', ISSUE, CTX)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Project ID isolation
// ---------------------------------------------------------------------------

describe('findDuplicatePendingPrompt — project isolation', () => {
  const existing: ApprovalItem[] = [makeApproval({ id: 'proj-1-fix', projectId: PROJ })];

  test('same prompt on different project is NOT a duplicate', () => {
    expect(findDuplicatePendingPrompt(existing, 'proj-other', CHAIN, 'Fix', ISSUE, CTX)).toBeUndefined();
  });

  test('same prompt on same project IS a duplicate', () => {
    expect(findDuplicatePendingPrompt(existing, PROJ, CHAIN, 'Fix', ISSUE, CTX)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Status filtering
// ---------------------------------------------------------------------------

describe('findDuplicatePendingPrompt — only matches pending status', () => {
  const statuses: ApprovalItem['status'][] = ['approved', 'sent', 'completed', 'failed', 'rejected'];

  statuses.forEach((status) => {
    test(`does NOT flag ${status} approval as duplicate`, () => {
      const nonPending: ApprovalItem[] = [makeApproval({ id: `id-${status}`, status })];
      expect(findDuplicatePendingPrompt(nonPending, PROJ, CHAIN, 'Fix', ISSUE, CTX)).toBeUndefined();
    });
  });

  test('only pending approvals trigger duplicate detection', () => {
    const mixed: ApprovalItem[] = [
      makeApproval({ id: 'sent', status: 'sent' }),
      makeApproval({ id: 'completed', status: 'completed' }),
      makeApproval({ id: 'pending', status: 'pending' }),
    ];
    const dup = findDuplicatePendingPrompt(mixed, PROJ, CHAIN, 'Fix', ISSUE, CTX);
    expect(dup!.id).toBe('pending');
  });
});

// ---------------------------------------------------------------------------
// Kind filtering
// ---------------------------------------------------------------------------

describe('findDuplicatePendingPrompt — only matches prompt kind', () => {
  test('command kind is never flagged as duplicate even with matching fields', () => {
    const commandItem: ApprovalItem[] = [
      makeApproval({ id: 'cmd-1', kind: 'command', promptType: undefined }),
    ];
    // kind: 'command' should not match even if other fields overlap
    const dup = findDuplicatePendingPrompt(commandItem, PROJ, CHAIN, 'Fix', ISSUE, CTX);
    expect(dup).toBeUndefined();
  });
});
