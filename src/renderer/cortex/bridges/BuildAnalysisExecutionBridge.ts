import { CortexBuildAnalysisBoundaryStatus, CortexExecutionValidationResult } from "../execution/CortexExecutionTypes";

export class BuildAnalysisExecutionBridge {
  label = "Build Analysis Execution Boundary";
  readonly = true;
  shellAccess = false;
  fileWrites = false;
  allowedFutureActions = [
    "Summarize existing build logs",
    "Inspect existing captured output",
    "Generate safe next-step prompt"
  ];
  blockedActions = [
    "Run builds automatically",
    "Apply patches",
    "Delete files",
    "Execute shell commands",
    "Write files"
  ];

  validateAction(action: string): CortexExecutionValidationResult {
    if (this.allowedFutureActions.includes(action)) {
      return {
        allowed: false,
        blockedReasons: ["Build-analysis bridge is read-only until a future manual execution phase."],
        warnings: ["Future action recognized but not executable yet."],
        requiredApprovals: ["Manual operator approval", "Build-analysis bridge enablement"]
      };
    }
    return {
      allowed: false,
      blockedReasons: ["Requested build-analysis action is blocked by scaffold policy."],
      warnings: [],
      requiredApprovals: ["Manual operator approval"]
    };
  }

  getStatus(): CortexBuildAnalysisBoundaryStatus {
    return {
      label: this.label,
      readonly: this.readonly,
      shellAccess: this.shellAccess,
      fileWrites: this.fileWrites,
      allowedFutureActions: this.allowedFutureActions,
      blockedActions: this.blockedActions
    };
  }
}
