import type { CortexProviderAdapter } from "./CortexProviderAdapter";
import type { CortexExecutionHistory } from "./CortexExecutionHistory";
import type { CortexExecutionPermissions } from "./CortexExecutionPermissions";
import type { CortexExecutionSandbox } from "./CortexExecutionSandbox";
import type { CortexManualExecutionQueue } from "./CortexManualExecutionQueue";
import type { CortexExecutionResult } from "./CortexExecutionResult";

export class CortexExecutionEngine {
  constructor(
    private readonly queue: CortexManualExecutionQueue,
    private readonly adapters: CortexProviderAdapter[],
    private readonly permissions: CortexExecutionPermissions,
    private readonly sandbox: CortexExecutionSandbox,
    private readonly history: CortexExecutionHistory
  ) {}

  async executeManualRequest(requestId: string): Promise<CortexExecutionResult> {
    const request = this.queue.getRequest(requestId);
    const startedAt = new Date().toISOString();
    if (!request) return this.recordBlocked("", "unknown", startedAt, ["Manual request not found."]);

    const adapter = this.adapters.find((entry) => entry.id === request.providerId);
    if (!adapter) {
      const result = this.recordBlocked(request.id, request.providerId, startedAt, ["Provider adapter not found."]);
      this.queue.markBlocked(request.id, result.error ?? "Provider adapter not found.");
      return result;
    }

    const readiness = adapter.describeReadiness();
    const permission = this.permissions.canExecuteProvider(request, readiness);
    const sandbox = this.sandbox.validateExecutionRequest(request);
    const adapterValidation = adapter.validateRequest(request);
    const blockedReasons = [
      ...permission.blockedReasons,
      ...sandbox.blockedReasons,
      ...adapterValidation.blockedReasons
    ];

    if (!permission.allowed || !sandbox.allowed || !adapterValidation.allowed || !adapter.executeManualRequest) {
      if (!adapter.executeManualRequest) blockedReasons.push("Provider adapter has no execution method.");
      const result = this.recordBlocked(request.id, adapter.id, startedAt, blockedReasons);
      this.queue.markBlocked(request.id, result.error ?? "Execution blocked.");
      return result;
    }

    this.queue.markRunning(request.id);
    const result = await adapter.executeManualRequest(request);
    this.history.addResult(result);
    if (result.status === "completed") this.queue.markCompleted(request.id, result.output ?? "");
    if (result.status === "failed") this.queue.markFailed(request.id, result.error ?? "Local provider execution failed.");
    if (result.status === "blocked") this.queue.markBlocked(request.id, result.error ?? "Execution blocked.");
    return result;
  }

  private recordBlocked(requestId: string, providerId: string, startedAt: string, blockedReasons: string[]): CortexExecutionResult {
    const completedAt = new Date().toISOString();
    const result: CortexExecutionResult = {
      id: crypto.randomUUID(),
      requestId,
      providerId,
      status: "blocked",
      startedAt,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      sandboxAllowed: false,
      blockedReasons,
      warnings: [],
      error: blockedReasons.join(" ")
    };
    this.history.addResult(result);
    return result;
  }
}
