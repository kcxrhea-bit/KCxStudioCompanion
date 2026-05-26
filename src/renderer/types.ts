export type FeatureStatus = "todo" | "in progress" | "done";
export type ProjectType = "Android App" | "Desktop App" | "Website" | "Game / Addon" | "3D Print / Maker" | "Robotics / Electronics" | "General Project";
export type BuildStatus = "Success" | "Failed" | "Running" | "Waiting Approval";
export type SystemState = "idle" | "processing" | "warning" | "error";
export type FeatureItem = { id: string; name: string; status: FeatureStatus };
export type CommandHistoryItem = { id: string; command: string; timestamp: string; success: boolean; outputPreview: string };
export type ProjectSnapshot = { filesFound: string[]; majorSourceFolders: string[]; totalFileCount: number; frameworks: string[]; buildSystems: string[]; entryPoints: string[]; approxProjectSize: string; detectedTypes: string[]; lastScanTime: string };
export type BuildIntelligence = { buildSuccessful: boolean; buildFailed: boolean; kotlinCompileErrors: number; typescriptErrors: number; gradleErrors: number; missingDependencyErrors: number };
export type BuildAnalysisResult = {
  detectedType: string;
  severity: "low" | "medium" | "high";
  likelyCause: string;
  likelyFiles: string[];
  likelySymbols: string[];
  file?: string;
  line?: number;
  column?: number;
  suggestedFix: string;
  confidence: number;
};
export type BuildLogRecord = { id: string; projectId: string; timestamp: string; rawLogText: string; analysis: BuildAnalysisResult[]; summary: string };
export type PatchReviewRecord = { id: string; projectId: string; timestamp: string; rawSummary: string; filesChanged: string[]; buildOutcome: "success" | "failure" | "unknown"; featureChanges: string[]; parserBuildChanges: string[]; riskLevel: "low" | "medium" | "high"; riskyPhrases: string[]; likelySystemsAffected: string[]; recommendedNextStep: string };
export type ArchitectureNotes = { notes: string; importantFiles: string; doNotRewriteAreas: string; knownFragileSystems: string };
export type ProjectMemory = { projectGoal: string; importantFiles: string; protectedFiles: string; protectedSymbols: string; doNotRewriteRules: string; workflowNotes: string };
export type Project = { id: string; name: string; path: string; projectType: ProjectType; appGoal: string; currentPhase: string; features: FeatureItem[]; memoryNotes: string; noRewriteRules: string; buildLogs: string; buildStatus?: BuildStatus; commandHistory: CommandHistoryItem[]; snapshot?: ProjectSnapshot; architectureNotes: ArchitectureNotes; projectMemory?: ProjectMemory; buildIntel?: BuildIntelligence; buildLogHistory?: BuildLogRecord[]; patchReviewHistory?: PatchReviewRecord[] };
export type ApprovalKind = "prompt" | "command";
export type ApprovalItem = { id: string; projectId: string; kind: ApprovalKind; title: string; payload: string; status: "pending" | "approved" | "sent" | "completed" | "failed" | "rejected"; createdAt: string; source?: "build-analysis" | "manual" | "other"; chainId?: string; chainType?: string; promptType?: "Fix" | "Validation" | "Regression" | "Other"; issueType?: string; contextKey?: string; approvedAt?: string; sentAt?: string; completedAt?: string; failedAt?: string };
export type TimelineType = "Prompt Generated" | "Prompt Approved" | "Prompt Sent" | "Prompt Completed" | "Prompt Failed" | "Command Executed" | "Build Succeeded" | "Build Failed" | "Project Scanned" | "Build Log Imported" | "Build Analysis Completed" | "Build Analysis Refined" | "Fix prompt generated from build analysis" | "Validation prompt generated" | "Regression prompt generated" | "Patch review analyzed" | "Duplicate prompt prevented" | "Protected architecture area detected";
export type TimelineEvent = { id: string; timestamp: string; type: TimelineType; projectId: string; summary: string; details?: string };

export type ProviderName = "Local KCx Brain" | "Ollama" | "OpenRouter" | "Groq" | "Gemini API" | "OpenAI";
export type ProviderCapability = "coding_assistant" | "summarizer" | "planning_engine" | "offline_orchestrator" | "patch_review" | "workflow_routing" | "safety_warnings" | "next_step_suggestions" | "risk_analysis" | "build_parsing";
export type ProviderStatus = "connected" | "disabled" | "placeholder" | "missing_api_key" | "unreachable" | "local_only" | "unavailable";
export type TaskCategory = "build_parsing" | "coding_patch" | "summaries" | "planning" | "prompt_cleanup" | "workflow_routing" | "safety_warnings" | "next_step_suggestions" | "risk_analysis" | "patch_review";
export type AiProvider = { providerId: string; displayName: ProviderName; enabled: boolean; preferred: boolean; status: ProviderStatus; apiKey: string; baseUrl: string; modelName: string; timeout: number; localOnly: boolean; supportsStreaming: boolean; capabilities: ProviderCapability[] };
export type AiRoutingRule = { task: TaskCategory; provider: ProviderName; reason: string };
export type AiDecisionTrace = { id: string; timestamp: string; task: TaskCategory; provider: ProviderName; reason: string; actionCategory: string; fallbackProvider?: ProviderName; timingMs?: number; success?: boolean; riskLevel?: "low" | "medium" | "high" };
export type SafetyWarning = { id: string; timestamp: string; projectId: string; message: string; severity: "low" | "medium" | "high" };
export type ReleaseSettings = { diagnosticsEnabled: boolean; telemetryEnabled: boolean; experimentalFeaturesEnabled: boolean; backupOnSave: boolean; buildChannel: "private-beta" | "public-beta" | "stable"; updateChannel: "manual" | "beta" | "stable" };
export type LicenseState = { mode: "community" | "trial" | "licensed"; licenseKeyHash: string; entitlements: string[]; cloudAccountId?: string; lastValidatedAt?: string };
export type AppState = { projects: Project[]; approvals: ApprovalItem[]; timeline: TimelineEvent[]; aiDecisionTrace: AiDecisionTrace[]; safetyWarnings: SafetyWarning[]; aiProviders: AiProvider[]; aiRoutingRules: AiRoutingRule[]; releaseSettings?: ReleaseSettings; license?: LicenseState; settings: { openAiApiKeyPlaceholder: string; ollamaPlaceholder: string; vsCodeExecutable: string; androidStudioExecutable: string; projectRootPath: string; gradleWrapperPath: string; terminalPath: string } };
export type CommandRequest = { projectId: string; command: string; args: string[]; cwd?: string };
export type CommandResult = { success: boolean; output: string; code: number | null };
export type ScanResult = ProjectSnapshot;
export type SystemTelemetryEvent = { id: string; at: string; label: string; level?: "info" | "processing" | "warning" | "error" };
export type ReleaseInfo = { productName: string; version: string; electron: string; chrome: string; node: string; platform: string; arch: string; channel: string; packaged: boolean };

declare global { interface Window { kcxApi: { getState: () => Promise<AppState>; saveState: (nextState: AppState) => Promise<AppState>; getReleaseInfo: () => Promise<ReleaseInfo>; runCommand: (request: CommandRequest) => Promise<CommandResult>; onBuildOutputLine: (callback: (event: SystemTelemetryEvent) => void) => () => void; scanProject: (rootPath: string) => Promise<ScanResult>; testProviderConnection: (provider: { displayName: ProviderName; apiKey: string; baseUrl: string; modelName: string; timeout: number; localOnly: boolean; enabled: boolean; status: ProviderStatus }) => Promise<{ status: ProviderStatus; message: string }>; }; } }
