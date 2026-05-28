import { blockedValidation, CortexProviderAdapter } from "../execution/CortexProviderAdapter";
import type { CortexExecutionResult } from "../execution/CortexExecutionResult";
import { CortexExecutionValidationResult, CortexManualExecutionRequest } from "../execution/CortexExecutionTypes";

export interface OllamaProviderConfig {
  endpoint: string;
  model: string;
  timeoutMs: number;
  enabled: boolean;
}

const DEFAULT_OLLAMA_CONFIG: OllamaProviderConfig = {
  endpoint: "http://127.0.0.1:11434/api/generate",
  model: "phi3:latest",
  timeoutMs: 30000,
  enabled: false
};

export class OllamaProviderAdapter implements CortexProviderAdapter {
  id = "ollama-provider-adapter";
  label = "Ollama Provider Scaffold";
  providerType = "local-ollama" as const;
  capabilities = ["local inference boundary", "model registry boundary", "manual inference request"];
  availability = "disabled" as const;
  readonly = true;
  requiresManualApproval = true;

  constructor(private readonly config: OllamaProviderConfig = DEFAULT_OLLAMA_CONFIG) {}

  canExecute(request?: CortexManualExecutionRequest): boolean {
    const readiness = this.getConfigReadiness();
    return Boolean(request && this.config.enabled && readiness.configured && /summar/i.test(request.purpose));
  }

  validateRequest(_request: CortexManualExecutionRequest): CortexExecutionValidationResult {
    const readiness = this.getConfigReadiness();
    const blockedReasons = [...readiness.blockedReasons];
    if (!/summar/i.test(_request.purpose)) blockedReasons.push("Ollama execution is limited to read-only summarization.");
    if (_request.prompt.length > 12000) blockedReasons.push("Prompt exceeds safe local size limit.");
    if (blockedReasons.length > 0) return blockedValidation(blockedReasons);
    return {
      allowed: true,
      blockedReasons: [],
      warnings: ["Manual localhost Ollama summarization only."],
      requiredApprovals: ["Manual operator approval"]
    };
  }

  async executeManualRequest(request: CortexManualExecutionRequest): Promise<CortexExecutionResult> {
    const startedAt = new Date().toISOString();
    const validation = this.validateRequest(request);
    if (!validation.allowed) {
      return {
        id: crypto.randomUUID(),
        requestId: request.id,
        providerId: this.id,
        status: "blocked",
        startedAt,
        completedAt: new Date().toISOString(),
        sandboxAllowed: false,
        blockedReasons: validation.blockedReasons,
        warnings: validation.warnings,
        error: validation.blockedReasons.join(" ")
      };
    }

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.model,
          prompt: request.prompt,
          stream: false
        }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Ollama responded with HTTP ${response.status}.`);
      const payload = await response.json() as { response?: string; error?: string };
      if (payload.error) throw new Error(payload.error);
      const completedAt = new Date().toISOString();
      return {
        id: crypto.randomUUID(),
        requestId: request.id,
        providerId: this.id,
        status: "completed",
        startedAt,
        completedAt,
        durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
        sandboxAllowed: true,
        output: payload.response?.trim() || "Local provider returned an empty summary.",
        blockedReasons: [],
        warnings: validation.warnings
      };
    } catch (error) {
      const completedAt = new Date().toISOString();
      return {
        id: crypto.randomUUID(),
        requestId: request.id,
        providerId: this.id,
        status: "failed",
        startedAt,
        completedAt,
        durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
        sandboxAllowed: true,
        blockedReasons: [],
        warnings: validation.warnings,
        error: error instanceof Error ? error.message : "Local provider execution failed."
      };
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  describeExecution(): string {
    return "Ollama adapter is local-only, disabled, and requires future manual approval before any network call.";
  }

  describeReadiness() {
    const readiness = this.getConfigReadiness();
    return {
      id: this.id,
      label: this.label,
      providerType: this.providerType,
      capabilities: this.capabilities,
      availability: this.config.enabled ? "configured" as const : this.availability,
      readonly: this.readonly,
      requiresManualApproval: this.requiresManualApproval,
      configured: readiness.configured,
      enabled: this.config.enabled,
      endpointValid: readiness.endpointValid,
      blockedReason: readiness.blockedReasons.join(" ") || "Manual approval required."
    };
  }

  getModelName(): string {
    return this.config.model;
  }

  enableManualLocalSummaries() {
    this.config.enabled = true;
  }

  disableManualLocalSummaries() {
    this.config.enabled = false;
  }

  private getConfigReadiness() {
    const blockedReasons: string[] = [];
    const endpointValid = this.isLocalEndpoint(this.config.endpoint);
    const timeoutValid = this.config.timeoutMs > 0 && this.config.timeoutMs <= 120000;

    if (!endpointValid) blockedReasons.push("Endpoint must be localhost or 127.0.0.1 only.");
    if (!this.config.model.trim()) blockedReasons.push("Model is not configured.");
    if (!timeoutValid) blockedReasons.push("Timeout must be between 1ms and 120000ms.");
    if (!this.config.enabled) blockedReasons.push("Adapter disabled.");

    return {
      configured: endpointValid && Boolean(this.config.model.trim()) && timeoutValid,
      endpointValid,
      blockedReasons
    };
  }

  private isLocalEndpoint(endpoint: string) {
    try {
      const url = new URL(endpoint);
      return (url.protocol === "http:" || url.protocol === "https:") && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    } catch {
      return false;
    }
  }
}
