import { cortexRuntime } from "../src/renderer/cortex/CortexRuntime";
import * as KCxModeAIBrainAdapterModule from "../src/renderer/cortex/providers/KCxModeAIBrainAdapter";
import { cortexEventBus } from "../src/renderer/cortex/CortexEventBus";

describe("CortexRuntime spec intake lifecycle", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    (cortexRuntime as any).manualExecutionQueue.clearAll();
    (cortexRuntime as any).ollamaProviderAdapter.enableManualLocalSummaries();
    (cortexRuntime as any).specIntakeRunning = false;
  });

  describe("KCxModeAI Brain fallback routing", () => {
    beforeEach(() => {
      (cortexRuntime as any).ollamaProviderAdapter.disableManualLocalSummaries();
      (cortexRuntime as any).specIntakeRunning = false;
      (cortexRuntime as any).cachedContext = { projectName: "KCx Studio Companion" };
    });

    test("uses KCxModeAI Brain fallback when Ollama is disabled", async () => {
      const emittedEvents: Array<{ event: string; payload: unknown }> = [];
      const unsub = cortexEventBus.subscribe((event) => {
        if (event.type === "spec-intake-completed") {
          emittedEvents.push({ event: event.type, payload: event.payload });
        }
      });

      await cortexRuntime.createSpecIntakeRequest("Add a small feature");

      unsub();
      expect(emittedEvents).toHaveLength(1);
      const payload = emittedEvents[0]?.payload as Record<string, unknown>;
      expect(payload?.source).toBe("kcxmodeai-brain");
      expect(payload?.fallbackUsed).toBe(true);
      expect(payload?.label).toBe("KCxModeAI Brain — local fallback");
      expect(typeof payload?.output).toBe("string");
      expect((payload?.output as string).length).toBeGreaterThan(0);
    });

    test("KCxModeAI Brain fallback output reaches spec-intake-completed path", async () => {
      const emittedEvents: Array<{ event: string; payload: unknown }> = [];
      const unsub = cortexEventBus.subscribe((event) => {
        if (event.type === "spec-intake-completed") {
          emittedEvents.push({ event: event.type, payload: event.payload });
        }
      });

      await cortexRuntime.createSpecIntakeRequest("Refactor the build panel");

      unsub();
      expect(emittedEvents).toHaveLength(1);
      const payload = emittedEvents[0]?.payload as Record<string, unknown>;
      expect(payload?.spec).toBe("Refactor the build panel");
      expect(payload?.projectName).toBe("KCx Studio Companion");
      expect(payload?.source).toBe("kcxmodeai-brain");
    });

    test("uses KCxModeAI Brain fallback when Ollama result is failed", async () => {
      (cortexRuntime as any).ollamaProviderAdapter.enableManualLocalSummaries();
      (cortexRuntime as any).specIntakeRunning = false;

      jest.spyOn((cortexRuntime as any).manualExecutionQueue, "createManualRequest").mockReturnValue({
        id: "req-1",
        status: "pending-approval",
        blockedReason: undefined,
        providerId: "ollama-provider-adapter"
      });
      jest.spyOn(cortexRuntime as any, "approveLatestManualExecutionRequest").mockReturnValue({ status: "approved" });
      jest.spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest").mockResolvedValue({
        status: "failed",
        error: "Ollama timeout",
        requestId: "req-1",
        providerId: "ollama-provider-adapter"
      });

      const emittedEvents: Array<{ event: string; payload: unknown }> = [];
      const unsub = cortexEventBus.subscribe((event) => {
        if (event.type === "spec-intake-completed") {
          emittedEvents.push({ event: event.type, payload: event.payload });
        }
      });

      await cortexRuntime.createSpecIntakeRequest("Add a settings panel");

      unsub();
      expect(emittedEvents).toHaveLength(1);
      const payload = emittedEvents[0]?.payload as Record<string, unknown>;
      expect(payload?.source).toBe("kcxmodeai-brain");
      expect(payload?.fallbackUsed).toBe(true);
    });

    test("falls through to rule-based offline fallback when KCxModeAI Brain throws", async () => {
      jest.spyOn(KCxModeAIBrainAdapterModule.kcxModeAIBrainAdapter, "generate").mockImplementation(() => {
        throw new Error("brain exploded");
      });

      const emittedEvents: Array<{ event: string; payload: unknown }> = [];
      const unsub = cortexEventBus.subscribe((event) => {
        if (event.type === "spec-intake-completed") {
          emittedEvents.push({ event: event.type, payload: event.payload });
        }
      });

      await cortexRuntime.createSpecIntakeRequest("Add a small feature");

      unsub();
      expect(emittedEvents).toHaveLength(1);
      const payload = emittedEvents[0]?.payload as Record<string, unknown>;
      // Rule-based offline path: no source/fallbackUsed, but offline: true
      expect(payload?.offline).toBe(true);
      expect(payload?.source).toBeUndefined();
    });

    test("no external app launch or network path used during KCxModeAI Brain fallback", async () => {
      const fetchSpy = jest.spyOn(global, "fetch");

      await cortexRuntime.createSpecIntakeRequest("Add a feature");

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  test("resets spec intake running state after execution failures so another request can start", async () => {
    jest.spyOn((cortexRuntime as any).manualExecutionQueue, "createManualRequest").mockReturnValue({
      id: "request-1",
      status: "pending-approval",
      blockedReason: undefined,
      providerId: "ollama-provider-adapter"
    });
    jest.spyOn(cortexRuntime as any, "approveLatestManualExecutionRequest").mockReturnValue({ status: "approved" });
    const executeLatestManualExecutionRequestSpy = jest
      .spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest")
      .mockRejectedValue(new Error("boom"));

    await expect(cortexRuntime.createSpecIntakeRequest("feature request")).rejects.toThrow("boom");
    expect(executeLatestManualExecutionRequestSpy).toHaveBeenCalledTimes(1);

    executeLatestManualExecutionRequestSpy.mockResolvedValue({
      status: "completed",
      output: "implementation prompt",
      requestId: "request-1",
      providerId: "ollama-provider-adapter"
    });

    await expect(cortexRuntime.createSpecIntakeRequest("feature request")).resolves.toBeUndefined();
    expect(executeLatestManualExecutionRequestSpy).toHaveBeenCalledTimes(2);
  });

  test("spec intake prompt includes grounding rules and explicit do-not-include constraints", async () => {
    (cortexRuntime as any).cachedContext = {
      projectName: "KCx Studio Companion",
      filesFound: [
        "src/renderer/App.tsx",
        "src/renderer/valhalla/ValhallaPage.tsx",
        "src/renderer/cortex/CortexRuntime.ts"
      ],
      frameworks: ["React", "TypeScript"],
      majorSourceFolders: ["src"],
      detectedTypes: ["TypeScript"]
    };

    const createManualRequestSpy = jest.spyOn((cortexRuntime as any).manualExecutionQueue, "createManualRequest").mockReturnValue({
      id: "request-1",
      status: "pending-approval",
      blockedReason: undefined,
      providerId: "ollama-provider-adapter"
    });
    jest.spyOn(cortexRuntime as any, "approveLatestManualExecutionRequest").mockReturnValue({ status: "approved" });
    jest.spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest").mockResolvedValue({
      status: "completed",
      output: "implementation prompt",
      requestId: "request-1",
      providerId: "ollama-provider-adapter"
    });

    await cortexRuntime.createSpecIntakeRequest("Add a small settings tweak");

    expect(createManualRequestSpy).toHaveBeenCalledTimes(1);
    const requestArgs = createManualRequestSpy.mock.calls[0]?.[0] as { prompt?: string } | undefined;
    expect(requestArgs?.prompt).toBeDefined();
    const prompt = requestArgs?.prompt ?? "";
    expect(prompt).toContain("Grounding Rules:");
    expect(prompt).toContain("Do Not Include:");
    expect(prompt).toContain('If the exact file is ambiguous, list the two most likely candidates');
    expect(prompt).toContain("Never suggest edits to dist/");
    expect(prompt).toContain("dist/");
    expect(prompt).toContain("npm.cmd run build");
    expect(prompt).toContain("git commit, git push");
    expect(prompt).toContain("src/renderer/App.tsx");
  });

  test("spec intake trims discovered files so grounded prompts stay under the sandbox limit", async () => {
    (cortexRuntime as any).cachedContext = {
      projectName: "KCx Studio Companion",
      filesFound: Array.from({ length: 100 }, (_, index) => `src/renderer/generated/file-${index}.tsx`),
      frameworks: ["React", "TypeScript"],
      majorSourceFolders: ["src"],
      detectedTypes: ["TypeScript"]
    };

    (cortexRuntime as any).ollamaProviderAdapter.enableManualLocalSummaries();
    const createManualRequestSpy = jest.spyOn((cortexRuntime as any).manualExecutionQueue, "createManualRequest");
    jest.spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest").mockResolvedValue({
      status: "completed",
      output: "implementation prompt",
      requestId: "request-1",
      providerId: "ollama-provider-adapter"
    });

    await cortexRuntime.createSpecIntakeRequest("Add a small settings tweak");

    expect(createManualRequestSpy).toHaveBeenCalledTimes(1);
    const requestArgs = createManualRequestSpy.mock.calls[0]?.[0] as { prompt?: string } | undefined;
    const prompt = requestArgs?.prompt ?? "";
    expect(prompt.length).toBeLessThan(12000);
    expect((prompt.match(/src\/renderer\/generated\/file-/g) || []).length).toBeLessThanOrEqual(12);
    expect(prompt).toContain("src/renderer/generated/file-0.tsx");
  });

  test("spec intake grounded prompt passes through live approval queue instead of failing permission classification", async () => {
    (cortexRuntime as any).cachedContext = {
      projectName: "KCx Studio Companion",
      filesFound: [
        "src/renderer/App.tsx",
        "src/renderer/cortex/CortexRuntime.ts",
        "src/renderer/cortex/execution/CortexExecutionPermissions.ts"
      ],
      frameworks: ["React", "TypeScript"],
      majorSourceFolders: ["src"],
      detectedTypes: ["TypeScript"]
    };

    const executeLatestManualExecutionRequestSpy = jest
      .spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest")
      .mockResolvedValue({
        status: "completed",
        output: "implementation prompt",
        requestId: "request-live",
        providerId: "ollama-provider-adapter"
      });

    await cortexRuntime.createSpecIntakeRequest("Add a small settings tweak");

    const snapshot = (cortexRuntime as any).manualExecutionQueue.getSnapshot();
    expect(snapshot.pendingCount).toBe(0);
    expect(snapshot.approvedCount).toBe(1);
    expect(snapshot.requests[0]?.status).toBe("approved");
    expect(snapshot.requests[0]?.blockedReason).toBe("");
    expect(executeLatestManualExecutionRequestSpy).toHaveBeenCalledTimes(1);
  });
});

describe("CortexRuntime KCxModeAI Brain diagnostics", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    (cortexRuntime as any).manualExecutionQueue.clearAll();
    (cortexRuntime as any).specIntakeRunning = false;
    (cortexRuntime as any).cachedContext = { projectName: "KCx Studio Companion" };
    // Reset diagnostics to baseline before each test
    (cortexRuntime as any).kcxBrainDiagnostics = {
      embeddedBrainAvailable: true,
      lastFallbackUsed: false,
    };
  });

  test("embeddedBrainAvailable is true at startup", () => {
    const diag = cortexRuntime.getKcxModeAIBrainDiagnostics();
    expect(diag.embeddedBrainAvailable).toBe(true);
  });

  test("getKcxModeAIBrainDiagnostics returns a copy, not the internal reference", () => {
    const d1 = cortexRuntime.getKcxModeAIBrainDiagnostics();
    const d2 = cortexRuntime.getKcxModeAIBrainDiagnostics();
    expect(d1).not.toBe(d2);
  });

  test("lastFallbackUsed becomes true after KCxModeAI Brain fallback succeeds", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.disableManualLocalSummaries();

    await cortexRuntime.createSpecIntakeRequest("Add a small feature");

    const diag = cortexRuntime.getKcxModeAIBrainDiagnostics();
    expect(diag.lastFallbackUsed).toBe(true);
  });

  test("lastResponseSource is 'kcxmodeai-brain' after fallback succeeds", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.disableManualLocalSummaries();

    await cortexRuntime.createSpecIntakeRequest("Add a small feature");

    const diag = cortexRuntime.getKcxModeAIBrainDiagnostics();
    expect(diag.lastResponseSource).toBe("kcxmodeai-brain");
  });

  test("lastUsedAt is set to a recent timestamp after fallback succeeds", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.disableManualLocalSummaries();
    const before = Date.now();

    await cortexRuntime.createSpecIntakeRequest("Add a small feature");

    const diag = cortexRuntime.getKcxModeAIBrainDiagnostics();
    expect(diag.lastUsedAt).toBeGreaterThanOrEqual(before);
    expect(diag.lastUsedAt).toBeLessThanOrEqual(Date.now());
  });

  test("lastError is set when KCxModeAI Brain adapter throws", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.disableManualLocalSummaries();
    jest.spyOn(KCxModeAIBrainAdapterModule.kcxModeAIBrainAdapter, "generate").mockImplementation(() => {
      throw new Error("brain exploded");
    });

    await cortexRuntime.createSpecIntakeRequest("Add a small feature");

    const diag = cortexRuntime.getKcxModeAIBrainDiagnostics();
    expect(diag.lastError).toBe("brain exploded");
    expect(diag.lastFallbackUsed).toBe(false);
  });

  test("lastError is cleared on subsequent successful fallback", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.disableManualLocalSummaries();
    // First call: brain throws
    jest.spyOn(KCxModeAIBrainAdapterModule.kcxModeAIBrainAdapter, "generate")
      .mockImplementationOnce(() => { throw new Error("transient error"); });

    await cortexRuntime.createSpecIntakeRequest("Add a small feature");
    expect(cortexRuntime.getKcxModeAIBrainDiagnostics().lastError).toBe("transient error");

    jest.restoreAllMocks();
    (cortexRuntime as any).specIntakeRunning = false;

    // Second call: brain succeeds
    await cortexRuntime.createSpecIntakeRequest("Add another feature");
    const diag = cortexRuntime.getKcxModeAIBrainDiagnostics();
    expect(diag.lastError).toBeUndefined();
    expect(diag.lastFallbackUsed).toBe(true);
  });

  test("embeddedBrain diagnostics are included in getSnapshot()", () => {
    const snapshot = cortexRuntime.getSnapshot();
    expect(snapshot.embeddedBrain).toBeDefined();
    expect(snapshot.embeddedBrain.embeddedBrainAvailable).toBe(true);
  });

  test("diagnostics do not claim network usage or external app launch", async () => {
    (cortexRuntime as any).ollamaProviderAdapter.disableManualLocalSummaries();
    const fetchSpy = jest.spyOn(global, "fetch");

    await cortexRuntime.createSpecIntakeRequest("Add a feature");

    expect(fetchSpy).not.toHaveBeenCalled();
    const diag = cortexRuntime.getKcxModeAIBrainDiagnostics();
    expect(diag.embeddedBrainAvailable).toBe(true);
  });
});
