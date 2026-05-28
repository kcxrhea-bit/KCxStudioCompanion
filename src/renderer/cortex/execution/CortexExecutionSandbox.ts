import { CortexExecutionSandboxSummary, CortexExecutionValidationResult, CortexManualExecutionRequest } from "./CortexExecutionTypes";

export class CortexExecutionSandbox {
  validateExecutionRequest(request: CortexManualExecutionRequest): CortexExecutionValidationResult {
    const blockedReasons: string[] = [];
    const warnings = [
      "Local-only sandbox allows read-only summarization only.",
      request.prompt.trim() ? "Prompt retained in local memory only." : "Prompt is empty."
    ];

    const policyChecks = [
      { rule: "prompt-required", matched: !request.prompt.trim(), reason: "Prompt is required before future execution." },
      { rule: "prompt-size", matched: request.prompt.length > 12000, reason: "Prompt exceeds safe local size limit." },
      { rule: "purpose-summarize-safe", matched: !/summar/i.test(request.purpose), reason: "Only summarize-safe purposes are executable." },
      { rule: "blocked-action-token", matched: /(shell|terminal|command|exec|write file|delete|remove files|apply patch|patch files|autonomous|background loop|daemon|persist memory)/i.test(request.purpose), reason: "Request contains blocked shell, file, patch, autonomous, or persistence intent." }
    ];

    policyChecks.forEach((check) => {
      if (check.matched) blockedReasons.push(check.reason);
    });

    console.warn("[CortexExecutionSandbox] sandbox validation trace", {
      requestId: request.id,
      providerId: request.providerId,
      purpose: request.purpose,
      allowed: blockedReasons.length === 0,
      blockedReasons,
      policyChecks
    });

    return {
      allowed: blockedReasons.length === 0,
      blockedReasons,
      warnings,
      requiredApprovals: ["Manual operator approval", "Adapter enablement", "Sandbox clearance"]
    };
  }

  describeRules(): CortexExecutionSandboxSummary {
    return {
      localOnly: true,
      cloudEndpointsAllowed: false,
      autonomousLoopsAllowed: false,
      backgroundExecutionAllowed: false,
      fileWritesAllowed: false,
      shellExecutionAllowed: false,
      automaticPatchApplicationAllowed: false,
      persistentMemoryWritesAllowed: false
    };
  }
}

export const cortexExecutionSandbox = new CortexExecutionSandbox();
