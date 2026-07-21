import { CortexExecutionPermissions } from "./CortexExecutionPermissions";
import { CortexExecutionSandbox } from "./CortexExecutionSandbox";
import { CortexManualExecutionQueueSnapshot, CortexManualExecutionRequest, CortexProviderAdapterReadiness } from "./CortexExecutionTypes";
import { evaluate as seraEvaluate } from "../sera/KCxSERA";

type CreateManualRequestInput = {
  providerId: string;
  prompt: string;
  purpose: string;
  /**
   * Optional user-authored portion of the request. When supplied, the
   * permission layer restricts summarize-safe token scanning to this text
   * instead of the full generated prompt. See CortexManualExecutionRequest.
   */
  userContent?: string;
};

export class CortexManualExecutionQueue {
  private requests: CortexManualExecutionRequest[] = [];

  constructor(
    private readonly permissions: CortexExecutionPermissions,
    private readonly sandbox: CortexExecutionSandbox
  ) {}

  createManualRequest(input: CreateManualRequestInput): CortexManualExecutionRequest {
    const request: CortexManualExecutionRequest = {
      id: crypto.randomUUID(),
      providerId: input.providerId,
      prompt: input.prompt,
      purpose: input.purpose,
      ...(typeof input.userContent === "string" ? { userContent: input.userContent } : {}),
      createdAt: new Date().toISOString(),
      status: "blocked",
      requiresApproval: true,
      blockedReason: "Execution adapter not enabled."
    };

    // SERA policy gate — runs before permissions and sandbox.
    // command is left unset for AI summarization requests so SERA evaluates intent only,
    // not the raw prompt text (which may contain shell-like patterns in example code).
    const seraResult = seraEvaluate({
      id: request.id,
      source: "cortex",
      intent: input.purpose,
      proposedAction: input.purpose,
    });
    console.warn("[CortexManualExecutionQueue] SERA evaluation", {
      requestId: request.id,
      decision: seraResult.decision,
      actionType: seraResult.actionType,
      reasons: seraResult.reasons,
    });
    if (seraResult.decision === "block") {
      request.status = "blocked";
      request.blockedReason = `SERA blocked: ${seraResult.safeSummary} — ${seraResult.reasons.join("; ")}`;
      this.requests = [request, ...this.requests].slice(0, 20);
      return request;
    }
    // requireApproval: let the normal permission/sandbox flow proceed.
    // SERA reasons are already logged above; they do not block execution.

    const createCheck = this.permissions.canCreateRequest();
    const sandboxCheck = this.sandbox.validateExecutionRequest(request);
    request.blockedReason = [...createCheck.blockedReasons, ...sandboxCheck.blockedReasons].join(" ") || request.blockedReason;
    request.status = sandboxCheck.allowed ? "pending-approval" : "blocked";
    console.warn("[CortexManualExecutionQueue] request created", {
      requestId: request.id,
      providerId: request.providerId,
      purpose: request.purpose,
      status: request.status,
      blockedReason: request.blockedReason,
      createAllowed: createCheck.allowed,
      sandboxAllowed: sandboxCheck.allowed
    });
    this.requests = [request, ...this.requests].slice(0, 20);
    return request;
  }

  approveManualRequest(requestId: string, adapter?: CortexProviderAdapterReadiness): CortexManualExecutionRequest | null {
    let updated: CortexManualExecutionRequest | null = null;
    this.requests = this.requests.map((request) => {
      if (request.id !== requestId) return request;
      console.warn("[CortexManualExecutionQueue] approval attempt", {
        requestId: request.id,
        providerId: request.providerId,
        purpose: request.purpose,
        status: request.status,
        adapterType: adapter?.providerType,
        adapterCapabilities: adapter?.capabilities,
        adapterEnabled: adapter?.enabled
      });
      const approval = this.permissions.canApproveRequest(request, adapter);
      updated = {
        ...request,
        status: approval.allowed ? "approved" : "blocked",
        blockedReason: approval.blockedReasons.join(" ") || ""
      };
      console.warn("[CortexManualExecutionQueue] approval result", {
        requestId: updated.id,
        providerId: updated.providerId,
        purpose: updated.purpose,
        status: updated.status,
        blockedReason: updated.blockedReason,
        allowed: approval.allowed
      });
      return updated;
    });
    return updated;
  }

  markRunning(requestId: string): CortexManualExecutionRequest | null {
    return this.updateRequest(requestId, { status: "running", blockedReason: "" });
  }

  markCompleted(requestId: string, result: string): CortexManualExecutionRequest | null {
    return this.updateRequest(requestId, { status: "completed", result, blockedReason: "" });
  }

  markFailed(requestId: string, error: string): CortexManualExecutionRequest | null {
    return this.updateRequest(requestId, { status: "failed", error, blockedReason: error });
  }

  markBlocked(requestId: string, reason: string): CortexManualExecutionRequest | null {
    return this.updateRequest(requestId, { status: "blocked", blockedReason: reason });
  }

  denyManualRequest(requestId: string): CortexManualExecutionRequest | null {
    let updated: CortexManualExecutionRequest | null = null;
    this.requests = this.requests.map((request) => {
      if (request.id !== requestId) return request;
      updated = {
        ...request,
        status: "denied",
        blockedReason: "Manual operator denied request."
      };
      return updated;
    });
    return updated;
  }

  clearManualRequest(requestId: string) {
    this.requests = this.requests.filter((request) => request.id !== requestId);
  }

  clearAll() {
    this.requests = [];
  }

  getRequest(requestId: string) {
    return this.requests.find((request) => request.id === requestId) ?? null;
  }

  getLatestRequest() {
    return this.requests[0] ?? null;
  }

  getSnapshot(): CortexManualExecutionQueueSnapshot {
    return {
      requests: this.requests,
      pendingCount: this.requests.filter((request) => request.status === "pending-approval").length,
      approvedCount: this.requests.filter((request) => request.status === "approved").length,
      runningCount: this.requests.filter((request) => request.status === "running").length,
      completedCount: this.requests.filter((request) => request.status === "completed").length,
      failedCount: this.requests.filter((request) => request.status === "failed").length,
      blockedCount: this.requests.filter((request) => request.status === "blocked").length,
      deniedCount: this.requests.filter((request) => request.status === "denied").length
    };
  }

  private updateRequest(requestId: string, patch: Partial<CortexManualExecutionRequest>): CortexManualExecutionRequest | null {
    let updated: CortexManualExecutionRequest | null = null;
    this.requests = this.requests.map((request) => {
      if (request.id !== requestId) return request;
      updated = { ...request, ...patch };
      return updated;
    });
    return updated;
  }
}
