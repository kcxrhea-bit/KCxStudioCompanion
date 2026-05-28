import { blockedValidation, CortexProviderAdapter } from "../execution/CortexProviderAdapter";
import { CortexAdapterAvailability, CortexExecutionValidationResult, CortexManualExecutionRequest } from "../execution/CortexExecutionTypes";

export class KCxModeAIProviderAdapter implements CortexProviderAdapter {
  id = "kcxmodeai-provider-adapter";
  label = "KCxModeAI Runtime Bridge";
  providerType = "kcxmodeai" as const;
  capabilities = ["local assistant routing", "model relay", "local context handoff", "provider health check"];
  availability: CortexAdapterAvailability = "disconnected";
  readonly = true;
  requiresManualApproval = true;
  role = "local desktop assistant/runtime provider";

  connect(): void {
    this.availability = "configured";
  }

  canExecute(): boolean {
    return false;
  }

  validateRequest(_request: CortexManualExecutionRequest): CortexExecutionValidationResult {
    return blockedValidation([
      "KCxModeAI runtime bridge is connected for Codex handoff only.",
      "Prompt handoff is copy/paste — no execution API is available."
    ]);
  }

  describeExecution(): string {
    return this.availability === "configured"
      ? "KCxModeAI bridge connected. Codex handoff channel active — copy/paste prompt delivery only."
      : "KCxModeAI bridge is disconnected and reserved for a future local runtime handoff.";
  }

  describeReadiness() {
    return {
      id: this.id,
      label: this.label,
      providerType: this.providerType,
      capabilities: this.capabilities,
      availability: this.availability,
      readonly: this.readonly,
      requiresManualApproval: this.requiresManualApproval,
      configured: this.availability === "configured",
      enabled: false,
      blockedReason: this.availability === "configured"
        ? "Codex handoff is manual copy/paste only — no execution API."
        : "Runtime bridge disconnected. Manual approval required for future activation."
    };
  }
}
