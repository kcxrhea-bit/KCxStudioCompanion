import type { CortexExecutionResult } from "./CortexExecutionResult";
import { CortexExecutionValidationResult, CortexManualExecutionRequest, CortexProviderAdapterReadiness } from "./CortexExecutionTypes";

export interface CortexProviderAdapter {
  id: string;
  label: string;
  providerType: CortexProviderAdapterReadiness["providerType"];
  capabilities: string[];
  availability: CortexProviderAdapterReadiness["availability"];
  readonly: boolean;
  requiresManualApproval: boolean;
  canExecute(request?: CortexManualExecutionRequest): boolean;
  validateRequest(request: CortexManualExecutionRequest): CortexExecutionValidationResult;
  executeManualRequest?(request: CortexManualExecutionRequest): Promise<CortexExecutionResult>;
  describeExecution(request?: CortexManualExecutionRequest): string;
  describeReadiness(): CortexProviderAdapterReadiness;
}

export const blockedValidation = (
  blockedReasons: string[],
  warnings: string[] = [],
  requiredApprovals: string[] = ["Manual operator approval"]
): CortexExecutionValidationResult => ({
  allowed: false,
  blockedReasons,
  warnings,
  requiredApprovals
});
