import { CortexExecutionPolicySummary, CortexExecutionValidationResult, CortexManualExecutionRequest, CortexProviderAdapterReadiness } from "./CortexExecutionTypes";

const denied = (reason: string, approvals: string[] = []): CortexExecutionValidationResult => ({
  allowed: false,
  blockedReasons: [reason],
  warnings: [],
  requiredApprovals: approvals
});

type SummarizeSafetyDiagnostic = {
  allowed: boolean;
  matchedToken?: string;
  matchedRule?: string;
  matchedText?: string;
  /** Which surface was scanned: user-authored content, or the whole prompt. */
  scannedSurface: "user-content" | "full-prompt";
};

export class CortexExecutionPermissions {
  canCreateRequest(): CortexExecutionValidationResult {
    return {
      allowed: true,
      blockedReasons: [],
      warnings: ["Request creation is local-only and does not execute providers."],
      requiredApprovals: ["Manual operator approval before any future execution"]
    };
  }

  canApproveRequest(request: CortexManualExecutionRequest, adapter?: CortexProviderAdapterReadiness): CortexExecutionValidationResult {
    const safety = this.getSummarizeSafetyDiagnostic(request);
    console.warn("[CortexExecutionPermissions] summarize-safe approval trace", {
      requestId: request.id,
      providerId: request.providerId,
      purpose: request.purpose,
      allowed: safety.allowed,
      matchedToken: safety.matchedToken,
      matchedRule: safety.matchedRule,
      matchedText: safety.matchedText,
      scannedSurface: safety.scannedSurface,
      adapterType: adapter?.providerType,
      adapterCapabilities: adapter?.capabilities,
      adapterEnabled: adapter?.enabled
    });

    if (!adapter?.enabled) return denied("Execution adapter not enabled.", ["Enable adapter", "Manual operator approval"]);
    if (request.status === "denied") return denied("Denied requests cannot be approved without a new request.");
    if (request.status === "running" || request.status === "completed") return denied("Only pending or blocked requests can be approved.");
    if (!safety.allowed) return denied("Only summarize-safe local requests can be approved.", ["Create summarize-safe request"]);
    return {
      allowed: true,
      blockedReasons: [],
      warnings: ["Approval permits one manual local read-only summarization attempt only."],
      requiredApprovals: []
    };
  }

  canExecuteProvider(request: CortexManualExecutionRequest, adapter?: CortexProviderAdapterReadiness): CortexExecutionValidationResult {
    const safety = this.getSummarizeSafetyDiagnostic(request);
    console.warn("[CortexExecutionPermissions] summarize-safe execution trace", {
      requestId: request.id,
      providerId: request.providerId,
      purpose: request.purpose,
      allowed: safety.allowed,
      matchedToken: safety.matchedToken,
      matchedRule: safety.matchedRule,
      matchedText: safety.matchedText,
      scannedSurface: safety.scannedSurface,
      adapterType: adapter?.providerType,
      adapterCapabilities: adapter?.capabilities,
      adapterEnabled: adapter?.enabled
    });

    if (request.status !== "approved") return denied("Manual request is not approved.", ["Manual operator approval"]);
    if (!adapter?.enabled) return denied("Execution adapter not enabled.", ["Enable adapter"]);
    if (!safety.allowed) return denied("Provider execution is limited to summarize-safe local requests.");
    return {
      allowed: true,
      blockedReasons: [],
      warnings: ["Execution is local-only, read-only, and manually initiated."],
      requiredApprovals: []
    };
  }

  canAccessBridge(): CortexExecutionValidationResult {
    return denied("Bridge access is denied until activation gate clearance.", ["Activation gate clearance"]);
  }

  canUseNetwork(endpoint?: string): CortexExecutionValidationResult {
    if (endpoint && this.isLocalEndpoint(endpoint)) {
      return {
        allowed: true,
        blockedReasons: [],
        warnings: ["Network use is restricted to this localhost provider request."],
        requiredApprovals: ["Manual operator approval"]
      };
    }
    return denied("Network access denied by default execution policy.");
  }

  canRunShellCommand(): CortexExecutionValidationResult {
    return denied("Shell command execution is denied.");
  }

  canWriteFiles(): CortexExecutionValidationResult {
    return denied("File writes are denied.");
  }

  describePolicy(): CortexExecutionPolicySummary {
    return {
      network: "localhost-only-manual",
      shellCommands: "denied",
      fileWrites: "denied",
      providerExecution: "manual-local-summarize-only",
      bridgeActivation: "activation-gate-required",
      cloudExecution: "denied"
    };
  }

  private isLocalEndpoint(endpoint: string) {
    try {
      const url = new URL(endpoint);
      return url.hostname === "localhost" || url.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  }

  /**
   * Returns the text that summarize-safe token scanning is allowed to inspect.
   *
   * Only user-authored content is scanned when the caller declares it. Trusted
   * application-generated context (fixed prompt templates, repository file
   * trees, filenames, architecture summaries and grounded source context) is
   * excluded, because it legitimately contains words such as "background",
   * "write" or "delete" inside real file paths and instructions.
   *
   * Callers that do not declare `userContent` keep the previous, stricter
   * behaviour of scanning the whole prompt.
   */
  private getScannableUserText(request: CortexManualExecutionRequest): string {
    return typeof request.userContent === "string" ? request.userContent : request.prompt;
  }

  private getSummarizeSafetyDiagnostic(request: CortexManualExecutionRequest): SummarizeSafetyDiagnostic {
    const scannedSurface: SummarizeSafetyDiagnostic["scannedSurface"] =
      typeof request.userContent === "string" ? "user-content" : "full-prompt";
    const haystack = `${request.purpose} ${this.getScannableUserText(request)}`;
    const dangerousPatterns = [
      { token: "shell", rule: "blocked shell token", regex: /\bshell\b/i },
      { token: "write", rule: "blocked write token", regex: /\bwrite\b/i },
      { token: "delete", rule: "blocked delete token", regex: /\bdelete\b/i },
      { token: "apply patch", rule: "blocked apply patch phrase", regex: /\bapply patch\b/i },
      { token: "patch files", rule: "blocked patch files phrase", regex: /\bpatch files\b/i },
      { token: "autonomous", rule: "blocked autonomous token", regex: /\bautonomous\b/i },
      { token: "background", rule: "blocked background token", regex: /\bbackground\b/i }
    ];

    const match = dangerousPatterns.find((entry) => entry.regex.test(haystack));
    const matchedText = match ? haystack.match(match.regex)?.[0] : undefined;

    if (match) {
      return {
        allowed: false,
        matchedToken: match.token,
        matchedRule: match.rule,
        matchedText,
        scannedSurface
      };
    }

    return {
      allowed: /summar/i.test(request.purpose),
      scannedSurface
    };
  }

  private isSummarizeSafe(request: CortexManualExecutionRequest) {
    return this.getSummarizeSafetyDiagnostic(request).allowed;
  }
}

export const cortexExecutionPermissions = new CortexExecutionPermissions();
