import { deriveBridgeReadinessFromSnapshot, BridgeReadinessContext } from "../src/renderer/cortex/bridges/CortexBridgeReadiness";
import type { CortexBridge } from "../src/renderer/cortex/types";

function makeBridge(id: string, overrides: Partial<CortexBridge> = {}): CortexBridge {
  return {
    id: id as CortexBridge["id"],
    label: id,
    state: "disconnected",
    permission: "read-only",
    lastActivityAt: null,
    readonly: true,
    readiness: 10,
    bridgeCategory: "runtime",
    ...overrides,
  };
}

function makeCtx(overrides: Partial<BridgeReadinessContext> = {}): BridgeReadinessContext {
  return {
    embeddedBrain: { embeddedBrainAvailable: false, lastFallbackUsed: false },
    telemetry: {
      lastResponseSource: "unknown",
      lastProviderAttempted: "unknown",
      lastProviderSucceeded: null,
      lastProviderFailed: null,
      lastProviderError: null,
      lastProviderUsedAt: null,
      providerAttemptCounts: { ollama: 0, "kcxmodeai-brain": 0, "rule-based": 0, blocked: 0, unknown: 0 },
      providerSuccessCounts: { ollama: 0, "kcxmodeai-brain": 0, "rule-based": 0, blocked: 0, unknown: 0 },
      providerFailureCounts: { ollama: 0, "kcxmodeai-brain": 0, "rule-based": 0, blocked: 0, unknown: 0 },
    },
    buildContextAvailable: false,
    projectMemoryEntries: 0,
    ollamaEnabled: false,
    ...overrides,
  };
}

describe("deriveBridgeReadinessFromSnapshot", () => {
  describe("KCxModeAI bridge", () => {
    test("shows local-ready/integrated when embedded brain is available", () => {
      const bridge = makeBridge("kcxmodeai");
      const ctx = makeCtx({ embeddedBrain: { embeddedBrainAvailable: true, lastFallbackUsed: false } });
      const result = deriveBridgeReadinessFromSnapshot(bridge, ctx);
      expect(result.readiness).toBeGreaterThan(50);
      expect(result.activationBlockedReason).toMatch(/local brain integrated/i);
    });

    test("shows higher readiness when Ollama is also enabled", () => {
      const bridge = makeBridge("kcxmodeai");
      const ctxOff = makeCtx({ embeddedBrain: { embeddedBrainAvailable: true, lastFallbackUsed: false }, ollamaEnabled: false });
      const ctxOn = makeCtx({ embeddedBrain: { embeddedBrainAvailable: true, lastFallbackUsed: false }, ollamaEnabled: true });
      const off = deriveBridgeReadinessFromSnapshot(bridge, ctxOff);
      const on = deriveBridgeReadinessFromSnapshot(bridge, ctxOn);
      expect(on.readiness!).toBeGreaterThanOrEqual(off.readiness!);
    });

    test("shows low readiness when embedded brain is unavailable", () => {
      const bridge = makeBridge("kcxmodeai");
      const ctx = makeCtx({ embeddedBrain: { embeddedBrainAvailable: false, lastFallbackUsed: false } });
      const result = deriveBridgeReadinessFromSnapshot(bridge, ctx);
      expect(result.readiness).toBeLessThanOrEqual(15);
    });
  });

  describe("RuntimeTelemetryBridge (build-telemetry)", () => {
    test("shows low readiness when no telemetry data", () => {
      const bridge = makeBridge("build-telemetry");
      const ctx = makeCtx();
      const result = deriveBridgeReadinessFromSnapshot(bridge, ctx);
      expect(result.readiness).toBeLessThan(20);
    });

    test("reflects telemetry attempt data when present", () => {
      const bridge = makeBridge("build-telemetry");
      const ctx = makeCtx({
        telemetry: {
          ...makeCtx().telemetry,
          providerAttemptCounts: { ollama: 3, "kcxmodeai-brain": 1, "rule-based": 0, blocked: 0, unknown: 0 },
          providerSuccessCounts: { ollama: 2, "kcxmodeai-brain": 1, "rule-based": 0, blocked: 0, unknown: 0 },
        },
      });
      const result = deriveBridgeReadinessFromSnapshot(bridge, ctx);
      expect(result.readiness).toBeGreaterThan(20);
      expect(result.activationBlockedReason).toMatch(/telemetry active/i);
    });
  });

  describe("External app bridges", () => {
    const externalIds = [
      "kcxmode-android", "robot-buddy", "ringer-restore",
      "kcx-site", "kcx-translator", "dino-holo-friend",
      "after-earth", "easy-launcher", "pc-streamer",
    ] as const;

    test.each(externalIds)("%s never shows high readiness", (bridgeId) => {
      const bridge = makeBridge(bridgeId);
      const ctx = makeCtx({ embeddedBrain: { embeddedBrainAvailable: true, lastFallbackUsed: true }, ollamaEnabled: true });
      const result = deriveBridgeReadinessFromSnapshot(bridge, ctx);
      expect(result.readiness).toBeLessThanOrEqual(10);
      expect(result.activationBlockedReason).toMatch(/external|dormant|future/i);
    });
  });

  describe("ProjectMemoryBridge", () => {
    test("shows higher readiness when memory entries exist", () => {
      const bridge = makeBridge("project-memory");
      const noMemory = makeCtx({ projectMemoryEntries: 0 });
      const withMemory = makeCtx({ projectMemoryEntries: 5 });
      const resultNo = deriveBridgeReadinessFromSnapshot(bridge, noMemory);
      const resultWith = deriveBridgeReadinessFromSnapshot(bridge, withMemory);
      expect(resultWith.readiness!).toBeGreaterThan(resultNo.readiness!);
      expect(resultWith.activationBlockedReason).toMatch(/memory entries present/i);
    });
  });

  describe("BuildAnalysisBridge (studio-companion-analysis)", () => {
    test("shows low readiness when no build context", () => {
      const bridge = makeBridge("studio-companion-analysis");
      const ctx = makeCtx({ buildContextAvailable: false });
      const result = deriveBridgeReadinessFromSnapshot(bridge, ctx);
      expect(result.readiness).toBeLessThan(20);
    });

    test("shows diagnostics-available status when build context present", () => {
      const bridge = makeBridge("studio-companion-analysis");
      const ctx = makeCtx({ buildContextAvailable: true });
      const result = deriveBridgeReadinessFromSnapshot(bridge, ctx);
      expect(result.activationBlockedReason).toMatch(/diagnostics available|not connected/i);
    });
  });

  describe("Unknown bridge IDs", () => {
    test("returns empty object for unknown bridge — no mutation", () => {
      const bridge = makeBridge("messenger");
      const ctx = makeCtx();
      const result = deriveBridgeReadinessFromSnapshot(bridge, ctx);
      expect(result).toEqual({});
    });
  });
});
