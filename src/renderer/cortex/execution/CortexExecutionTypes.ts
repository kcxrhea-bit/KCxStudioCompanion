import type { CortexExecutionResult } from "./CortexExecutionResult";

export type CortexExecutionStatus =
  | "draft"
  | "pending-approval"
  | "blocked"
  | "approved"
  | "running"
  | "completed"
  | "failed"
  | "denied";

export type CortexProviderAdapterType = "local-ollama" | "kcxmodeai" | "build-analysis" | "future-local";
export type CortexAdapterAvailability = "disabled" | "disconnected" | "not-configured" | "configured" | "unavailable";

export interface CortexManualExecutionRequest {
  id: string;
  providerId: string;
  prompt: string;
  purpose: string;
  /**
   * The user-authored portion of the request (e.g. the raw Spec Intake text).
   *
   * `prompt` is assembled by the application and contains trusted, generated
   * context — fixed prompt templates, repository file trees, filenames and
   * architecture summaries. Scanning that trusted context for dangerous tokens
   * produces false positives (a real file named `background.css` matched the
   * blocked `background` token and denied approval).
   *
   * When this field is set, summarize-safe token scanning is restricted to it.
   * When it is absent, scanning falls back to the full prompt so that callers
   * which have not declared a user-authored surface stay strictly gated.
   */
  userContent?: string;
  createdAt: string;
  status: CortexExecutionStatus;
  requiresApproval: boolean;
  blockedReason: string;
  result?: string;
  error?: string;
}

export interface CortexExecutionValidationResult {
  allowed: boolean;
  blockedReasons: string[];
  warnings: string[];
  requiredApprovals: string[];
}

export interface CortexProviderAdapterReadiness {
  id: string;
  label: string;
  providerType: CortexProviderAdapterType;
  capabilities: string[];
  availability: CortexAdapterAvailability;
  readonly: boolean;
  requiresManualApproval: boolean;
  configured: boolean;
  enabled: boolean;
  endpointValid?: boolean;
  blockedReason: string;
}

export interface CortexManualExecutionQueueSnapshot {
  requests: CortexManualExecutionRequest[];
  pendingCount: number;
  approvedCount: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
  blockedCount: number;
  deniedCount: number;
}

export interface CortexExecutionPolicySummary {
  network: "denied" | "localhost-only-manual";
  shellCommands: "denied";
  fileWrites: "denied";
  providerExecution: "manual-local-summarize-only";
  bridgeActivation: "activation-gate-required";
  cloudExecution: "denied";
}

export interface CortexExecutionSandboxSummary {
  localOnly: boolean;
  cloudEndpointsAllowed: boolean;
  autonomousLoopsAllowed: boolean;
  backgroundExecutionAllowed: boolean;
  fileWritesAllowed: boolean;
  shellExecutionAllowed: boolean;
  automaticPatchApplicationAllowed: boolean;
  persistentMemoryWritesAllowed: boolean;
}

export interface CortexBuildAnalysisBoundaryStatus {
  label: string;
  readonly: boolean;
  shellAccess: boolean;
  fileWrites: boolean;
  allowedFutureActions: string[];
  blockedActions: string[];
}

export interface CortexLocalExecutionReadiness {
  initialized: boolean;
  activeExecution: boolean;
  copy: string;
  adapters: CortexProviderAdapterReadiness[];
  manualQueue: CortexManualExecutionQueueSnapshot;
  permissions: CortexExecutionPolicySummary;
  sandbox: CortexExecutionSandboxSummary;
  buildAnalysisBridge: CortexBuildAnalysisBoundaryStatus;
  results: CortexExecutionResult[];
}
