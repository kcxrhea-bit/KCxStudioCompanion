import { normalize } from "../src/renderer/cortex/intelligence/SmartBrainNormalizer";

describe("SmartBrainNormalizer", () => {
  test("classifies rewrite+push spec as refactor or architecture with rewrite reduced", () => {
    const result = normalize(
      "rewrite the whole cortex panel and copy paste whatever from examples, make it work somehow, then push it"
    );

    expect(result.rewriteRisk).toBe(true);
    expect(result.diagnostics.rewriteReduced).toBe(true);
    expect(["refactor", "architecture"]).toContain(result.taskType);
    expect(["Medium", "Risky"]).toContain(result.riskLevel);

    const { replacementsApplied } = result.diagnostics;
    expect(replacementsApplied).toContain("rewrite it/everything");
    expect(replacementsApplied).toContain("copy paste");
    expect(replacementsApplied).toContain("make it work somehow");
    expect(replacementsApplied).toContain("push it");
  });

  test("sanitized output removes unsafe wording and preserves architecture continuity", () => {
    const result = normalize(
      "rewrite the whole cortex panel and copy paste whatever from examples, make it work somehow, then push it"
    );

    const { sanitizedInput } = result;
    expect(sanitizedInput).not.toMatch(/\brewrite the whole\b/i);
    expect(sanitizedInput).not.toMatch(/\bcopy[- ]paste\b/i);
    expect(sanitizedInput).not.toMatch(/\bmake it work somehow\b/i);
    expect(sanitizedInput).not.toMatch(/\bpush it\b/i);
  });

  test("normalized goal resembles grounded implementation guidance", () => {
    const result = normalize(
      "rewrite the whole cortex panel and copy paste whatever from examples, make it work somehow, then push it"
    );

    expect(result.goal).toMatch(/inspect|targeted|minimal|specific/i);
  });

  test("structuredPrompt includes safety rules and do-not-touch list", () => {
    const result = normalize(
      "rewrite the whole cortex panel and copy paste whatever from examples, make it work somehow, then push it"
    );

    expect(result.structuredPrompt).toContain("Safety rules:");
    expect(result.structuredPrompt).toContain("Do not touch:");
    expect(result.structuredPrompt).toContain("No broad rewrites");
  });

  test("rewrite warning is emitted", () => {
    const result = normalize(
      "rewrite the whole cortex panel and copy paste whatever from examples, make it work somehow, then push it"
    );

    expect(result.warnings.some((w) => /rewrite/i.test(w))).toBe(true);
  });

  test("rewrite detection happens before sanitization — rewriteRisk and scopeReduced reflect raw input", () => {
    const result = normalize(
      "rewrite the whole cortex panel and copy paste whatever from examples, make it work somehow, then push it"
    );

    expect(result.diagnostics.rewriteRisk).toBe(true);
    expect(result.diagnostics.scopeReduced).toBe(true);
    expect(result.diagnostics.replacementsApplied).toContain("rewrite it/everything");
    expect(result.diagnostics.replacementsApplied).toContain("copy paste");
    expect(result.diagnostics.replacementsApplied).toContain("make it work somehow");
    expect(result.diagnostics.replacementsApplied).toContain("push it");
    expect(["refactor", "architecture"]).toContain(result.diagnostics.detectedTaskType);
    expect(["Medium", "Risky"]).toContain(result.diagnostics.riskLevel);
  });

  test("sanitization preserves core objective — status badge mention survives, unsafe wording removed", () => {
    const result = normalize(
      "copy paste a status badge thing and make it work somehow"
    );

    expect(result.diagnostics.effectiveInput).toMatch(/status badge/i);
    expect(result.diagnostics.effectiveInput).not.toMatch(/copy[- ]paste/i);
    expect(result.diagnostics.effectiveInput).not.toMatch(/make it work somehow/i);
    expect(result.diagnostics.effectiveInput).not.toMatch(/\bpush\b/i);
  });

  test("safe prompt stays safe with no replacements", () => {
    const result = normalize(
      "Add a small status badge to the Cortex panel showing Ready, Processing, and Blocked."
    );

    expect(result.diagnostics.riskLevel).toBe("Safe");
    expect(result.diagnostics.rewriteRisk).toBe(false);
    expect(result.diagnostics.scopeReduced).toBe(false);
    expect(result.diagnostics.replacementsApplied).toHaveLength(0);
    expect(["UI polish", "feature request"]).toContain(result.diagnostics.detectedTaskType);
  });

  test("destructive prompt is flagged risky with rewrite risk and scope reduction", () => {
    const result = normalize(
      "delete everything and rebuild the whole app"
    );

    expect(result.diagnostics.riskLevel).toBe("Risky");
    expect(result.diagnostics.rewriteRisk).toBe(true);
    expect(result.diagnostics.scopeReduced).toBe(true);
    expect(result.diagnostics.unsafeInstructionsDetected.length).toBeGreaterThan(0);
    expect(result.structuredPrompt).toMatch(/No broad rewrites|Scope reduced|targeted/i);
  });

  test("repeated calls with same destructive input produce identical diagnostics (lastIndex regression guard)", () => {
    const input = "delete everything and rebuild the whole app";
    const r1 = normalize(input);
    const r2 = normalize(input);

    expect(r1.diagnostics.unsafeInstructionsDetected).toEqual(r2.diagnostics.unsafeInstructionsDetected);
    expect(r1.diagnostics.replacementsApplied).toEqual(r2.diagnostics.replacementsApplied);
    expect(r1.diagnostics.rewriteRisk).toBe(r2.diagnostics.rewriteRisk);
    expect(r1.diagnostics.riskLevel).toBe(r2.diagnostics.riskLevel);
    expect(r1.diagnostics.unsafeInstructionsDetected.length).toBeGreaterThan(0);
  });

  test("diagnostics object is complete with all pipeline phases", () => {
    const result = normalize(
      "rewrite the whole cortex panel and copy paste whatever from examples, make it work somehow, then push it"
    );

    const d = result.diagnostics;
    expect(d.originalInput).toBeDefined();
    expect(d.detectedTaskType).toBeDefined();
    expect(d.riskLevel).toBeDefined();
    expect(typeof d.rewriteRisk).toBe("boolean");
    expect(Array.isArray(d.unsafeInstructionsDetected)).toBe(true);
    expect(Array.isArray(d.replacementsApplied)).toBe(true);
    expect(d.sanitizedInput).toBeDefined();
    expect(d.effectiveInput).toBeDefined();
    expect(typeof d.scopeReduced).toBe("boolean");
  });
});
