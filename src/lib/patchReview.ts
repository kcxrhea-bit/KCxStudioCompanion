/**
 * Extracted from src/renderer/App.tsx — analyzePatchReview as a pure function.
 * App.tsx version reads from component state; this version takes params directly.
 */

import type { PatchReviewRecord } from '../renderer/types';

export const analyzePatchReview = (raw: string, projectId: string): PatchReviewRecord | null => {
  if (!raw.trim()) return null;

  // Longer extensions first so tsx/jsx/kts aren't truncated to ts/js/kt by greedy alternation
  const filesChanged = Array.from(new Set(raw.match(/[\w./-]+\.(kts|kt|tsx|ts|jsx|js|xml|json|gradle)/g) || []));
  const riskyPhrases = ['refactor', 'rewrite', 'large cleanup', 'architecture change'].filter(
    (p) => raw.toLowerCase().includes(p),
  );
  const buildOutcome: 'success' | 'failure' | 'unknown' =
    /build successful|passed/i.test(raw) ? 'success' : /build failed|error/i.test(raw) ? 'failure' : 'unknown';
  const featureChanges = (raw.match(/added|removed|feature/gi) || []).slice(0, 5);
  const parserBuildChanges = (raw.match(/parser|build|gradle|ksp|typescript|compose/gi) || []).slice(0, 8);
  const likelySystemsAffected = Array.from(
    new Set([...filesChanged.map((f) => f.split('/')[0]), ...parserBuildChanges]),
  ).slice(0, 8);
  const riskLevel: 'low' | 'medium' | 'high' =
    riskyPhrases.length > 1 ? 'high' : riskyPhrases.length === 1 ? 'medium' : 'low';

  const recommendedNextStep =
    buildOutcome === 'success'
      ? 'Generate regression prompt and run broader validation checks.'
      : /unresolved reference/i.test(raw)
      ? 'Inspect imports/usages and regenerate fix + validation prompts.'
      : /typescript/i.test(raw)
      ? 'Inspect modified interfaces/types and re-run TS build.'
      : /room|ksp/i.test(raw)
      ? 'Clean/rebuild and inspect generated schema/impl artifacts.'
      : 'Run targeted validation prompt and compare against latest build analysis.';

  return {
    id: crypto.randomUUID(),
    projectId,
    timestamp: new Date().toISOString(),
    rawSummary: raw,
    filesChanged,
    buildOutcome,
    featureChanges,
    parserBuildChanges,
    riskLevel,
    riskyPhrases,
    likelySystemsAffected,
    recommendedNextStep,
  };
};
