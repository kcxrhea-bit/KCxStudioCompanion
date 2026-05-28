import { cortexRuntime } from "../src/renderer/cortex/CortexRuntime";
import * as KCxModeAIBrainAdapterModule from "../src/renderer/cortex/providers/KCxModeAIBrainAdapter";
import { cortexEventBus } from "../src/renderer/cortex/CortexEventBus";

function resetTelemetry() {
  (cortexRuntime as any).providerTelemetry = {
    lastResponseSource: "unknown",
    lastProviderAttempted: "unknown",
    lastProviderSucceeded: null,
    lastProviderFailed: null,
    lastProviderError: null,
    lastProviderUsedAt: null,
    providerAttemptCounts: { ollama: 0, "kcxmodeai-brain": 0, "rule-based": 0, blocked: 0, unknown: 0 },
    providerSuccessCounts: { ollama: 0, "kcxmodeai-brain": 0, "rule-based": 0, blocked: 0, unknown: 0 },
    providerFailureCounts: { ollama: 0, "kcxmodeai-brain": 0, "rule-based": 0, blocked: 0, unknown: 0 },
  };
}

beforeEach(() => {
  jest.restoreAllMocks();
  (cortexRuntime as any).manualExecutionQueue.clearAll();
  (cortexRuntime as any).specIntakeRunning = false;
  (cortexRuntime as any).cachedContext = { projectName: "TelemetryTestProject" };
  resetTelemetry();
});

describe("Provider telemetry — Ollama success", () => {
  test("records lastResponseSource as 'ollama' when Ollama succeeds", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.enableManualLocalSummaries();
    jest.spyOn((cortexRuntime as any).manualExecutionQueue, "createManualRequest").mockReturnValue({
      id: "req-1", status: "pending-approval", blockedReason: "", providerId: "ollama-provider-adapter"
    });
    jest.spyOn(cortexRuntime as any, "approveLatestManualExecutionRequest").mockReturnValue({ status: "approved" });
    jest.spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest").mockResolvedValue({
      status: "completed", output: "Ollama output", requestId: "req-1", providerId: "ollama-provider-adapter"
    });

    await cortexRuntime.createSpecIntakeRequest("Add a feature");

    const tel = cortexRuntime.getProviderTelemetry();
    expect(tel.lastResponseSource).toBe("ollama");
    expect(tel.lastProviderSucceeded).toBe("ollama");
    expect(tel.providerAttemptCounts.ollama).toBe(1);
    expect(tel.providerSuccessCounts.ollama).toBe(1);
    expect(tel.providerFailureCounts.ollama).toBe(0);
  });

  test("lastProviderUsedAt is set to a recent timestamp on Ollama success", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.enableManualLocalSummaries();
    jest.spyOn((cortexRuntime as any).manualExecutionQueue, "createManualRequest").mockReturnValue({
      id: "req-1", status: "pending-approval", blockedReason: "", providerId: "ollama-provider-adapter"
    });
    jest.spyOn(cortexRuntime as any, "approveLatestManualExecutionRequest").mockReturnValue({ status: "approved" });
    jest.spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest").mockResolvedValue({
      status: "completed", output: "Ollama output", requestId: "req-1", providerId: "ollama-provider-adapter"
    });

    const before = Date.now();
    await cortexRuntime.createSpecIntakeRequest("Add a feature");

    const tel = cortexRuntime.getProviderTelemetry();
    expect(tel.lastProviderUsedAt).toBeGreaterThanOrEqual(before);
    expect(tel.lastProviderUsedAt).toBeLessThanOrEqual(Date.now());
  });

  test("telemetry is exposed in getSnapshot()", async () => {
    const snapshot = cortexRuntime.getSnapshot();
    expect(snapshot.telemetry).toBeDefined();
    expect(typeof snapshot.telemetry.providerAttemptCounts.ollama).toBe("number");
  });
});

describe("Provider telemetry — Ollama fail then KCxModeAI Brain success", () => {
  test("records 'kcxmodeai-brain' as lastResponseSource after Ollama fails", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.enableManualLocalSummaries();
    jest.spyOn((cortexRuntime as any).manualExecutionQueue, "createManualRequest").mockReturnValue({
      id: "req-1", status: "pending-approval", blockedReason: "", providerId: "ollama-provider-adapter"
    });
    jest.spyOn(cortexRuntime as any, "approveLatestManualExecutionRequest").mockReturnValue({ status: "approved" });
    jest.spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest").mockResolvedValue({
      status: "failed", error: "Ollama timeout", requestId: "req-1", providerId: "ollama-provider-adapter"
    });

    await cortexRuntime.createSpecIntakeRequest("Add a feature");

    const tel = cortexRuntime.getProviderTelemetry();
    expect(tel.lastResponseSource).toBe("kcxmodeai-brain");
    expect(tel.lastProviderSucceeded).toBe("kcxmodeai-brain");
    expect(tel.providerAttemptCounts.ollama).toBe(1);
    expect(tel.providerFailureCounts.ollama).toBe(1);
    expect(tel.providerAttemptCounts["kcxmodeai-brain"]).toBe(1);
    expect(tel.providerSuccessCounts["kcxmodeai-brain"]).toBe(1);
  });

  test("lastProviderFailed is 'ollama' after Ollama fails", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.enableManualLocalSummaries();
    jest.spyOn((cortexRuntime as any).manualExecutionQueue, "createManualRequest").mockReturnValue({
      id: "req-1", status: "pending-approval", blockedReason: "", providerId: "ollama-provider-adapter"
    });
    jest.spyOn(cortexRuntime as any, "approveLatestManualExecutionRequest").mockReturnValue({ status: "approved" });
    jest.spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest").mockResolvedValue({
      status: "failed", error: "Ollama timeout", requestId: "req-1", providerId: "ollama-provider-adapter"
    });

    await cortexRuntime.createSpecIntakeRequest("Add a feature");

    const tel = cortexRuntime.getProviderTelemetry();
    expect(tel.lastProviderFailed).toBe("ollama");
  });
});

describe("Provider telemetry — KCxModeAI Brain fail then rule-based", () => {
  test("records 'rule-based' as lastResponseSource when both Ollama and brain fail", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.disableManualLocalSummaries();
    jest.spyOn(KCxModeAIBrainAdapterModule.kcxModeAIBrainAdapter, "generate").mockImplementation(() => {
      throw new Error("brain exploded");
    });

    await cortexRuntime.createSpecIntakeRequest("Add a feature");

    const tel = cortexRuntime.getProviderTelemetry();
    expect(tel.lastResponseSource).toBe("rule-based");
    expect(tel.lastProviderSucceeded).toBe("rule-based");
    expect(tel.providerAttemptCounts["kcxmodeai-brain"]).toBe(1);
    expect(tel.providerFailureCounts["kcxmodeai-brain"]).toBe(1);
    expect(tel.providerAttemptCounts["rule-based"]).toBe(1);
    expect(tel.providerSuccessCounts["rule-based"]).toBe(1);
  });
});

describe("Provider telemetry — counts increment deterministically", () => {
  test("attempt and success counts increment on each Ollama success call", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.enableManualLocalSummaries();

    for (let i = 0; i < 3; i++) {
      (cortexRuntime as any).specIntakeRunning = false;
      jest.spyOn((cortexRuntime as any).manualExecutionQueue, "createManualRequest").mockReturnValue({
        id: `req-${i}`, status: "pending-approval", blockedReason: "", providerId: "ollama-provider-adapter"
      });
      jest.spyOn(cortexRuntime as any, "approveLatestManualExecutionRequest").mockReturnValue({ status: "approved" });
      jest.spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest").mockResolvedValue({
        status: "completed", output: "output", requestId: `req-${i}`, providerId: "ollama-provider-adapter"
      });
      await cortexRuntime.createSpecIntakeRequest("Add a feature");
      jest.restoreAllMocks();
    }

    const tel = cortexRuntime.getProviderTelemetry();
    expect(tel.providerAttemptCounts.ollama).toBe(3);
    expect(tel.providerSuccessCounts.ollama).toBe(3);
  });
});

describe("Provider telemetry — error truncation", () => {
  test("long provider errors are truncated to at most 300 characters in telemetry", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.disableManualLocalSummaries();
    const longError = "x".repeat(1000);
    jest.spyOn(KCxModeAIBrainAdapterModule.kcxModeAIBrainAdapter, "generate").mockImplementation(() => {
      throw new Error(longError);
    });

    await cortexRuntime.createSpecIntakeRequest("Add a feature");

    const tel = cortexRuntime.getProviderTelemetry();
    expect(tel.lastProviderError).not.toBeNull();
    expect((tel.lastProviderError as string).length).toBeLessThanOrEqual(300);
  });
});

describe("Provider telemetry — no fetch during brain fallback", () => {
  test("fetch is not called during KCxModeAI Brain fallback path", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.disableManualLocalSummaries();
    const fetchSpy = jest.spyOn(global, "fetch");

    await cortexRuntime.createSpecIntakeRequest("Add a feature");

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("Provider telemetry — blocked path", () => {
  test("blocked request records 'blocked' in attempt and failure counts", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.enableManualLocalSummaries();
    jest.spyOn((cortexRuntime as any).manualExecutionQueue, "createManualRequest").mockReturnValue({
      id: "req-blocked", status: "blocked", blockedReason: "Sandbox blocked.", providerId: "ollama-provider-adapter"
    });

    await cortexRuntime.createSpecIntakeRequest("Add a feature");

    const tel = cortexRuntime.getProviderTelemetry();
    expect(tel.providerAttemptCounts.blocked).toBe(1);
    expect(tel.providerFailureCounts.blocked).toBe(1);
    expect(tel.lastProviderFailed).toBe("blocked");
  });
});

describe("Provider telemetry — getProviderTelemetry returns a copy", () => {
  test("mutating returned telemetry does not affect internal state", () => {
    const tel = cortexRuntime.getProviderTelemetry();
    tel.providerAttemptCounts.ollama = 9999;
    expect(cortexRuntime.getProviderTelemetry().providerAttemptCounts.ollama).toBe(0);
  });
});
