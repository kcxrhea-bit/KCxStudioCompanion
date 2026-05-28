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
