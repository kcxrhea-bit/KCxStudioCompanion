import { cortexExecutionPermissions } from "../src/renderer/cortex/execution/CortexExecutionPermissions";
import { CortexExecutionSandbox } from "../src/renderer/cortex/execution/CortexExecutionSandbox";
import { CortexManualExecutionQueue } from "../src/renderer/cortex/execution/CortexManualExecutionQueue";
import type { CortexProviderAdapterReadiness } from "../src/renderer/cortex/execution/CortexExecutionTypes";
import { cortexRuntime } from "../src/renderer/cortex/CortexRuntime";
import { cortexEventBus } from "../src/renderer/cortex/CortexEventBus";
import { isOllamaInferenceReady, resolveOllamaChipState } from "../src/renderer/cortex/ollamaStatus";

const sandbox = new CortexExecutionSandbox();

const adapter: CortexProviderAdapterReadiness = {
  id: "ollama-provider-adapter",
  label: "Ollama",
  providerType: "local-ollama",
  capabilities: ["local_inference"],
  availability: "configured",
  readonly: false,
  requiresManualApproval: true,
  configured: true,
  enabled: true,
  endpointValid: true,
  blockedReason: ""
};

const SPEC_INTAKE_PURPOSE = "Summarize feature specification into structured implementation guidance";

describe("Spec Intake permission scanning is restricted to user-authored content", () => {
  test("a trusted src tree containing background.css does not block a safe Spec Intake request", () => {
    const queue = new CortexManualExecutionQueue(cortexExecutionPermissions, sandbox);
    const generatedPrompt = [
      "Read-only local summarization only.",
      "Full src/ file tree (depth <= 4 - these are the REAL files, use exact paths):",
      "```",
      "src/renderer/styles/background.css",
      "src/renderer/components/BackgroundLayer.tsx",
      "src/main/services/writeQueue.ts",
      "src/main/services/deleteProjectService.ts",
      "```",
      "Feature request: Add a dark mode toggle to the settings tab."
    ].join("\n");

    const created = queue.createManualRequest({
      providerId: "ollama-provider-adapter",
      prompt: generatedPrompt,
      purpose: SPEC_INTAKE_PURPOSE,
      userContent: "Add a dark mode toggle to the settings tab."
    });

    expect(created.status).toBe("pending-approval");

    const approved = queue.approveManualRequest(created.id, adapter);
    expect(approved?.status).toBe("approved");
    expect(approved?.blockedReason).toBe("");
  });

  test("a genuinely unsafe user request with shell/delete/write intent is still blocked", () => {
    const unsafeRequests = [
      "Run a shell command to rebuild the project",
      "Delete the old build artifacts for me",
      "Write files directly into src/main once you are done"
    ];

    unsafeRequests.forEach((userContent) => {
      const queue = new CortexManualExecutionQueue(cortexExecutionPermissions, sandbox);
      const created = queue.createManualRequest({
        providerId: "ollama-provider-adapter",
        prompt: `Read-only local summarization only.\nFeature request: ${userContent}`,
        purpose: SPEC_INTAKE_PURPOSE,
        userContent
      });

      expect(created.status).toBe("pending-approval");

      const blocked = queue.approveManualRequest(created.id, adapter);
      expect(blocked?.status).toBe("blocked");
      expect(blocked?.blockedReason).toContain("Only summarize-safe local requests can be approved.");
    });
  });

  test("requests that do not declare userContent still scan the full prompt", () => {
    const queue = new CortexManualExecutionQueue(cortexExecutionPermissions, sandbox);
    const created = queue.createManualRequest({
      providerId: "ollama-provider-adapter",
      prompt: "Delete every generated file while summarizing.",
      purpose: "Summarize runtime readiness"
    });

    const blocked = queue.approveManualRequest(created.id, adapter);
    expect(blocked?.status).toBe("blocked");
    expect(blocked?.blockedReason).toContain("Only summarize-safe local requests can be approved.");
  });

  test("provider execution keeps the same summarize-safe gate for user content", () => {
    const unsafe = cortexExecutionPermissions.canExecuteProvider(
      {
        id: "r-unsafe",
        providerId: "ollama-provider-adapter",
        prompt: "Read-only local summarization only. src/renderer/styles/background.css",
        purpose: SPEC_INTAKE_PURPOSE,
        userContent: "Delete the dist folder",
        createdAt: new Date().toISOString(),
        status: "approved",
        requiresApproval: true,
        blockedReason: ""
      },
      adapter
    );
    expect(unsafe.allowed).toBe(false);

    const safe = cortexExecutionPermissions.canExecuteProvider(
      {
        id: "r-safe",
        providerId: "ollama-provider-adapter",
        prompt: "Read-only local summarization only. src/renderer/styles/background.css",
        purpose: SPEC_INTAKE_PURPOSE,
        userContent: "Add a dark mode toggle",
        createdAt: new Date().toISOString(),
        status: "approved",
        requiresApproval: true,
        blockedReason: ""
      },
      adapter
    );
    expect(safe.allowed).toBe(true);
  });
});

describe("Spec Intake runtime routing", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    (cortexRuntime as any).manualExecutionQueue.clearAll();
    (cortexRuntime as any).ollamaProviderAdapter.enableManualLocalSummaries();
    (cortexRuntime as any).specIntakeRunning = false;
    (cortexRuntime as any).cachedContext = {
      projectName: "KCx Studio Companion",
      filesFound: ["src/renderer/App.tsx", "src/renderer/styles/background.css"],
      frameworks: ["React", "TypeScript"],
      majorSourceFolders: ["src"],
      detectedTypes: ["TypeScript"]
    };
  });

  test("spec intake passes the raw user spec as userContent, not the generated prompt", async () => {
    const createManualRequestSpy = jest
      .spyOn((cortexRuntime as any).manualExecutionQueue, "createManualRequest")
      .mockReturnValue({
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

    await cortexRuntime.createSpecIntakeRequest("Add a dark mode toggle");

    const args = createManualRequestSpy.mock.calls[0]?.[0] as { userContent?: string; prompt?: string };
    expect(args?.userContent).toBe("Add a dark mode toggle");
    expect(args?.prompt).toContain("Grounding Rules:");
  });

  test("a grounded prompt containing background.css reaches the Approval Queue via the live permission layer", async () => {
    jest.spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest").mockResolvedValue({
      status: "completed",
      output: "implementation prompt",
      requestId: "request-live",
      providerId: "ollama-provider-adapter"
    });

    await cortexRuntime.createSpecIntakeRequest("Add a dark mode toggle to the settings tab");

    const snapshot = (cortexRuntime as any).manualExecutionQueue.getSnapshot();
    expect(snapshot.approvedCount).toBe(1);
    expect(snapshot.requests[0]?.status).toBe("approved");
    expect(snapshot.requests[0]?.blockedReason).toBe("");
  });

  test("successful Ollama-backed output reaches the Approval Queue via spec-intake-completed", async () => {
    jest.spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest").mockResolvedValue({
      status: "completed",
      output: "1. inspect src/renderer/App.tsx",
      requestId: "request-live",
      providerId: "ollama-provider-adapter"
    });

    const completed: Array<Record<string, unknown>> = [];
    const unsub = cortexEventBus.subscribe((event) => {
      if (event.type === "spec-intake-completed") completed.push(event.payload ?? {});
    });

    await cortexRuntime.createSpecIntakeRequest("Add a dark mode toggle to the settings tab");
    unsub();

    expect(completed).toHaveLength(1);
    expect(completed[0]?.output).toBe("1. inspect src/renderer/App.tsx");
    expect(completed[0]?.offline).toBeUndefined();
    expect(completed[0]?.source).toBeUndefined();
  });

  test("approval failure invokes the embedded KCxModeAI Brain fallback instead of returning silently", async () => {
    jest.spyOn(cortexRuntime as any, "approveLatestManualExecutionRequest").mockReturnValue({
      id: "request-blocked",
      status: "blocked",
      blockedReason: "Only summarize-safe local requests can be approved."
    });
    const executeSpy = jest.spyOn(cortexRuntime as any, "executeLatestManualExecutionRequest");

    const completed: Array<Record<string, unknown>> = [];
    const statuses: Array<Record<string, unknown>> = [];
    const unsub = cortexEventBus.subscribe((event) => {
      if (event.type === "spec-intake-completed") completed.push(event.payload ?? {});
      if (event.type === "spec-intake-status") statuses.push(event.payload ?? {});
    });

    await cortexRuntime.createSpecIntakeRequest("Add a dark mode toggle");
    unsub();

    // Provider execution must not happen when approval failed.
    expect(executeSpy).not.toHaveBeenCalled();
    // Embedded brain fallback produced output for the Approval Queue.
    expect(completed).toHaveLength(1);
    expect(completed[0]?.source).toBe("kcxmodeai-brain");
    expect(completed[0]?.fallbackUsed).toBe(true);
    // User-facing status was surfaced.
    expect(statuses).toHaveLength(1);
    expect(statuses[0]?.level).toBe("warning");
    expect(String(statuses[0]?.message)).toContain("Spec intake approval failed");
  });

  test("approval failure still records the permission timeline entry", async () => {
    jest.spyOn(cortexRuntime as any, "approveLatestManualExecutionRequest").mockReturnValue({
      id: "request-blocked",
      status: "blocked",
      blockedReason: "Only summarize-safe local requests can be approved."
    });

    cortexRuntime.clearTimeline();
    await cortexRuntime.createSpecIntakeRequest("Add a dark mode toggle");

    const timeline = cortexRuntime.getSnapshot().timelineEvents;
    const denied = timeline.find((entry) => entry.title === "Spec intake approval failed");
    expect(denied).toBeDefined();
    expect(denied?.type).toBe("permission");
    expect(denied?.severity).toBe("denied");
  });
});

describe("Ollama status chip reflects runtime readiness", () => {
  beforeEach(() => {
    (cortexRuntime as any).manualExecutionQueue.clearAll();
  });

  test("chip state matches the live adapter readiness when Ollama is enabled", () => {
    (cortexRuntime as any).ollamaProviderAdapter.enableManualLocalSummaries();
    const snapshot = cortexRuntime.getSnapshot();

    expect(snapshot.localExecution.activeExecution).toBe(true);
    expect(isOllamaInferenceReady(snapshot)).toBe(true);
    expect(resolveOllamaChipState(isOllamaInferenceReady(snapshot))).toEqual({
      live: true,
      label: "Live",
      pillClass: "status-active"
    });
  });

  test("chip state matches the live adapter readiness when Ollama is disabled", () => {
    (cortexRuntime as any).ollamaProviderAdapter.disableManualLocalSummaries();
    const snapshot = cortexRuntime.getSnapshot();

    expect(snapshot.localExecution.activeExecution).toBe(false);
    expect(isOllamaInferenceReady(snapshot)).toBe(false);
    expect(resolveOllamaChipState(isOllamaInferenceReady(snapshot))).toEqual({
      live: false,
      label: "Dormant",
      pillClass: "status-dormant"
    });
  });

  test("chip state tracks readiness changes without requiring a cortex-status-changed event", () => {
    (cortexRuntime as any).ollamaProviderAdapter.disableManualLocalSummaries();
    expect(resolveOllamaChipState(isOllamaInferenceReady(cortexRuntime.getSnapshot())).label).toBe("Dormant");

    (cortexRuntime as any).ollamaProviderAdapter.enableManualLocalSummaries();
    expect(resolveOllamaChipState(isOllamaInferenceReady(cortexRuntime.getSnapshot())).label).toBe("Live");
  });
});
