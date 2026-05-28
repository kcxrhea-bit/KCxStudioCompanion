import type { CortexLocalExecutionReadiness } from "./execution/CortexExecutionTypes";

export type CortexSystemId =
  | "studio-companion-analysis"
  | "kcxmodeai"
  | "valhalla-runtime"
  | "build-telemetry"
  | "project-memory"
  | "messenger"
  | "studio-companion-self"
  | "cortex-intelligence"
  | "smart-brain-normalizer"
  | "kcxmode-android"
  | "messenger-desktop"
  | "robot-buddy"
  | "ringer-restore"
  | "kcx-site"
  | "kcx-translator"
  | "dino-holo-friend"
  | "after-earth"
  | "easy-launcher"
  | "godzilla-viewer"
  | "pc-streamer";

export type CortexRuntimeState = "dormant" | "contained" | "monitoring" | "read-only" | "active";
export type CortexProviderType = "local-ollama" | "kcxmodeai" | "studio-companion-analysis" | "future-cloud-provider";
export type CortexBridgeState = "disconnected" | "connected" | "monitoring" | "disabled";
export type CortexPermissionLevel = "read-only" | "monitored" | "operator-approved" | "restricted" | "disabled";
export type CortexEventType = "runtime-state-changed" | "bridge-state-changed" | "provider-registered" | "permission-updated" | "ecosystem-alert" | "cortex-status-changed" | "project-context-updated" | "cortex-execution-completed" | "build-log-line" | "system-state-changed" | "system-logs-cleared" | "build-failure-detected" | "spec-intake-completed";
export type CortexActivationTarget = "provider" | "bridge";
export type CortexActivationState = "locked" | "pending" | "denied" | "contained" | "unavailable" | "operator-review";
export type CortexTimelineEventType = "runtime" | "diagnostics" | "provider" | "bridge" | "activation" | "containment" | "permission" | "system";
export type CortexTimelineSeverity = "info" | "monitoring" | "warning" | "locked" | "denied";

export interface CortexEvent {
  id: string;
  type: CortexEventType;
  at: string;
  message: string;
  payload?: Record<string, unknown>;
}

export interface CortexBridge {
  id: CortexSystemId;
  label: string;
  state: CortexBridgeState;
  permission: CortexPermissionLevel;
  lastActivityAt: string | null;
  readonly: boolean;
  readiness: number;
  activationBlockedReason?: string;
  activationPath?: string;
  runtimeDependency?: string;
  bridgeCategory?: "runtime" | "analysis" | "memory" | "messaging" | "telemetry" | "ai-provider" | "ecosystem";
}

export interface CortexProvider {
  id: string;
  type: CortexProviderType;
  label: string;
  state: CortexRuntimeState;
  capabilities: string[];
  available: boolean;
  readiness: number;
  providerCategory?: "local-runtime" | "analysis" | "ai-provider" | "telemetry" | "orchestration" | "memory";
  runtimeAvailability?: string;
  activationBlockedReason?: string;
  activationPath?: string;
  dependencyRequirement?: string;
  containmentState?: string;
  readonly?: boolean;
}

export interface CortexActivationRequest {
  id: string;
  targetId: string;
  targetType: CortexActivationTarget;
  state: CortexActivationState;
  requestedAt: string;
  reason: string;
  blockedReason: string;
  operatorApprovalRequired: boolean;
  containmentLock: boolean;
}

export interface CortexTimelineEvent {
  id: string;
  type: CortexTimelineEventType;
  severity: CortexTimelineSeverity;
  title: string;
  description: string;
  timestamp: string;
  sourceId?: string;
  sourceType?: "provider" | "bridge" | "runtime" | "system";
  readonly: boolean;
  contained: boolean;
}

export type ProviderSource = "ollama" | "kcxmodeai-brain" | "rule-based" | "blocked" | "unknown";

export interface CortexProviderTelemetry {
  lastResponseSource: ProviderSource;
  lastProviderAttempted: ProviderSource;
  lastProviderSucceeded: ProviderSource | null;
  lastProviderFailed: ProviderSource | null;
  lastProviderError: string | null;
  lastProviderUsedAt: number | null;
  providerAttemptCounts: Record<ProviderSource, number>;
  providerSuccessCounts: Record<ProviderSource, number>;
  providerFailureCounts: Record<ProviderSource, number>;
}

export interface KCxModeAIBrainDiagnostics {
  embeddedBrainAvailable: boolean;
  lastFallbackUsed: boolean;
  lastResponseSource?: "kcxmodeai-brain" | "ollama" | "rule-based";
  lastError?: string;
  lastUsedAt?: number;
}

export interface CortexRuntimeSnapshot {
  state: CortexRuntimeState;
  contained: boolean;
  providers: CortexProvider[];
  bridges: CortexBridge[];
  permissions: Record<string, CortexPermissionLevel>;
  alerts: string[];
  activationRequests: CortexActivationRequest[];
  timelineEvents: CortexTimelineEvent[];
  operationalSummary: {
    runtimePosture: string;
    commandReadiness: number;
    activeExecution: boolean;
    containedSystems: number;
    readonlySystems: number;
    lockedSystems: number;
    monitoringSystems: number;
    activationRequests: number;
    operationalCapabilities: string[];
    blockedCapabilities: string[];
  };
  diagnostics: {
    runtimeHealth: "stable";
    containment: "active";
    bridgeReadiness: number;
    providerAvailability: number;
    permissionIntegrity: "stable";
    alerts: string[];
    warnings: string[];
    lastRuntimeCheck: string;
  };
  localExecution: CortexLocalExecutionReadiness;
  embeddedBrain: KCxModeAIBrainDiagnostics;
  telemetry: CortexProviderTelemetry;
}
