// KCxSERA — Security Enforcement Runtime Authority
// Deterministic execution-boundary governance. Does not execute anything.
// The model suggests. SERA governs.

// ─── Types ───────────────────────────────────────────────────────────────────

export type SERAActionType =
  | "readOnly"
  | "localSafe"
  | "buildTest"
  | "fileModification"
  | "highRisk"
  | "forbidden"
  | "unknown";

export type SERADecision = "allow" | "requireApproval" | "block";

export interface SERAPolicyResult {
  decision: SERADecision;
  actionType: SERAActionType;
  reasons: string[];
  requiredApprovals: string[];
  safeSummary: string;
  blockedTokens?: string[];
}

export interface SERARequest {
  id: string;
  source: "cortex" | "valhalla" | "user" | "system";
  intent: string;
  proposedAction: string;
  command?: string;
  fileTargets?: string[];
  projectKey?: string;
  provider?: string;
}

export interface SERALogEntry {
  requestId: string;
  timestamp: string;
  source: SERARequest["source"];
  proposedAction: string;
  decision: SERADecision;
  actionType: SERAActionType;
  reasons: string[];
  blockedTokens: string[];
  requiredApprovals: string[];
  finalStatus: "evaluated";
}

// ─── Forbidden token scanner ──────────────────────────────────────────────────

const FORBIDDEN_PATTERNS: Array<{ token: string; regex: RegExp }> = [
  { token: "iex",                   regex: /\biex\b/i },
  { token: "irm",                   regex: /\birm\b/i },
  { token: "ExecutionPolicy Bypass",regex: /ExecutionPolicy\s+Bypass/i },
  { token: "curl|bash",             regex: /curl\b.+\|\s*bash/i },
  { token: "curl",                  regex: /\bcurl\b/i },
  { token: "remote script",         regex: /https?:\/\/[^\s]+\.(ps1|sh|bat|cmd)/i },
  { token: "powershell -Command",   regex: /powershell\b.*-Command/i },
  { token: "rm -rf",                regex: /\brm\s+-rf\b/i },
  { token: "del /s",                regex: /\bdel\s+\/s\b/i },
  { token: "rmdir /s",              regex: /\brmdir\s+\/s\b/i },
  { token: "format",                regex: /\bformat\s+[a-z]:/i },
  { token: "reg delete",            regex: /\breg\s+delete\b/i },
  { token: "reg add",               regex: /\breg\s+add\b/i },
  { token: "regedit",               regex: /\bregedit\b/i },
  { token: "credential exfil",      regex: /\b(credential|password|secret|api[_\s-]?key)\s*(steal|dump|exfil|send|upload|transmit)/i },
  { token: "hidden persistence",    regex: /\b(schtasks|taskschd|startup\s+folder|run\s+key|autorun)\b/i },
  { token: "arbitrary path traversal", regex: /\.\.[/\\]\.\.[/\\]/i },
  { token: "destroy everything",    regex: /\b(delete|destroy|wipe|erase|nuke)\b.{0,40}\b(everything|all files|repo|system|disk)\b/i },
  { token: "pipe to shell",         regex: /\|\s*(bash|sh|cmd|powershell|pwsh)\b/i },
];

function scanForbiddenTokens(haystack: string): string[] {
  return FORBIDDEN_PATTERNS
    .filter(({ regex }) => regex.test(haystack))
    .map(({ token }) => token);
}

// ─── High-risk patterns ───────────────────────────────────────────────────────

const HIGH_RISK_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "npm install",           regex: /\bnpm\.?cmd\s+install\b|\bnpm\s+install\b/i },
  { label: "yarn add",              regex: /\byarn\s+add\b/i },
  { label: "pip install",           regex: /\bpip\s+install\b/i },
  { label: "package manager mutation", regex: /\b(install|uninstall|update|upgrade)\s+[a-z@][\w/-]+/i },
  { label: "shell execution",       regex: /\b(exec|spawn|child_process|shell\.exec)\b/i },
  { label: "delete files",          regex: /\b(delete|remove|unlink)\s+(file|folder|directory|path)\b/i },
  { label: "modify permissions",    regex: /\b(chmod|chown|icacls|takeown|cacls)\b/i },
  { label: "runtime injection",     regex: /\binject\b.*\b(runtime|process|memory|dll)\b/i },
  { label: "execution policy change", regex: /\bSet-ExecutionPolicy\b/i },
];

function scanHighRisk(haystack: string): string[] {
  return HIGH_RISK_PATTERNS
    .filter(({ regex }) => regex.test(haystack))
    .map(({ label }) => label);
}

// ─── Shell chaining / metacharacter detection ─────────────────────────────────

const CHAINING_PATTERNS: Array<{ token: string; regex: RegExp }> = [
  { token: "&&",  regex: /&&/ },
  { token: "||",  regex: /\|\|/ },
  { token: ";",   regex: /;/ },
  { token: "pipe", regex: /\|/ },
  { token: "backtick", regex: /`/ },
  { token: "$(",  regex: /\$\(/ },
];

function scanChainingTokens(command: string): string[] {
  return CHAINING_PATTERNS
    .filter(({ regex }) => regex.test(command))
    .map(({ token }) => token);
}

// ─── Known-safe allowlists ────────────────────────────────────────────────────

const BUILD_TEST_COMMANDS = [
  /^npm\.cmd\s+run\s+build$/i,
  /^npm\.cmd\s+test\b/i,
  /^npm\.cmd\s+run\s+test\b/i,
  /^gradlew\.bat\s+assemble\w*/i,
  /^gradlew\.bat\s+bundle\w*/i,
  /^gradlew\.bat\s+test\b/i,
  /^tsc\b/i,
];

const LOCAL_SAFE_PATTERNS: RegExp[] = [
  /\b(embedded|local)\s+(kcxmodeai|brain|fallback)\b/i,
  /\bkcxmodeai.brain\b/i,
  /\bopen\s+(project\s+root|known\s+local\s+folder)\b/i,
  /\binspect\s+(config|local\s+provider|runtime\s+telemetry|memory)\b/i,
  /\broute\s+to\s+diagnostics\b/i,
  /\blocal\s+ollama\b/i,
];

const READ_ONLY_PATTERNS: RegExp[] = [
  /\b(read|scan|inspect|view|show|list|get|fetch)\b/i,
  /\bsummar(ize|y|ization)\b/i,
  /\banalyze\b/i,
  /\btelemetry\b/i,
  /\bdiagnostic(s)?\b/i,
  /\bproject\s+structure\b/i,
  /\bbuild\s+log\b/i,
  /\bprovider\s+state\b/i,
  /\bruntime\s+status\b/i,
  /\bmemory\s+state\b/i,
];

const FILE_MODIFICATION_PATTERNS: RegExp[] = [
  /\b(apply|create|generate|update|edit|modify|write|patch)\s+(file|source|config|patch)\b/i,
  /\bapply\s+patch\b/i,
  /\bpatch\s+file(s)?\b/i,
  /\bgenerate\s+file(s)?\b/i,
];

// ─── Policy evaluator ─────────────────────────────────────────────────────────

function buildHaystack(request: SERARequest): string {
  return [
    request.intent,
    request.proposedAction,
    request.command ?? "",
    (request.fileTargets ?? []).join(" "),
    request.provider ?? "",
  ].join(" ");
}

export function evaluate(request: SERARequest): SERAPolicyResult {
  const haystack = buildHaystack(request);
  const commandHaystack = request.command ?? haystack;

  // 1. Forbidden — always block
  const forbiddenTokens = scanForbiddenTokens(haystack);
  if (forbiddenTokens.length > 0) {
    const result: SERAPolicyResult = {
      decision: "block",
      actionType: "forbidden",
      reasons: [
        "Request contains forbidden execution tokens.",
        ...forbiddenTokens.map((t) => `Blocked token: ${t}`),
      ],
      requiredApprovals: [],
      safeSummary: "Blocked — forbidden execution pattern detected.",
      blockedTokens: forbiddenTokens,
    };
    _appendAuditEntry(request, result);
    return result;
  }

  // 1b. Shell chaining in command — block
  const chainingTokens = request.command ? scanChainingTokens(commandHaystack) : [];
  if (chainingTokens.length > 0) {
    const result: SERAPolicyResult = {
      decision: "block",
      actionType: "forbidden",
      reasons: [
        "Command contains shell chaining or metacharacters.",
        ...chainingTokens.map((t) => `Blocked token: ${t}`),
      ],
      requiredApprovals: [],
      safeSummary: "Blocked — shell chaining detected in command.",
      blockedTokens: chainingTokens,
    };
    _appendAuditEntry(request, result);
    return result;
  }

  // 2. High-risk
  const highRiskMatches = scanHighRisk(haystack);
  if (highRiskMatches.length > 0) {
    const result: SERAPolicyResult = {
      decision: "requireApproval",
      actionType: "highRisk",
      reasons: [
        "Request contains high-risk execution patterns.",
        ...highRiskMatches.map((m) => `High-risk pattern: ${m}`),
      ],
      requiredApprovals: ["Manual operator approval", "High-risk acknowledgement"],
      safeSummary: "High-risk action — requires explicit operator approval.",
    };
    _appendAuditEntry(request, result);
    return result;
  }

  // 3. Known build/test commands — requireApproval
  if (request.command) {
    const cmd = request.command.trim();
    if (BUILD_TEST_COMMANDS.some((rx) => rx.test(cmd))) {
      const result: SERAPolicyResult = {
        decision: "requireApproval",
        actionType: "buildTest",
        reasons: ["Known build or test command — operator approval required before execution."],
        requiredApprovals: ["Manual operator approval"],
        safeSummary: "Known build/test command — requires approval.",
      };
      _appendAuditEntry(request, result);
      return result;
    }
  }

  // 3b. Build/test intent without explicit command
  if (/\b(build|test|compile|assemble|gradlew|typescript|tsc|jest|vitest)\b/i.test(haystack)) {
    const result: SERAPolicyResult = {
      decision: "requireApproval",
      actionType: "buildTest",
      reasons: ["Intent contains build or test operation — operator approval required."],
      requiredApprovals: ["Manual operator approval"],
      safeSummary: "Build or test operation — requires approval.",
    };
    _appendAuditEntry(request, result);
    return result;
  }

  // 4. File modification
  if (FILE_MODIFICATION_PATTERNS.some((rx) => rx.test(haystack))) {
    const result: SERAPolicyResult = {
      decision: "requireApproval",
      actionType: "fileModification",
      reasons: ["Request involves file modification — operator approval required."],
      requiredApprovals: ["Manual operator approval"],
      safeSummary: "File modification — requires approval.",
    };
    _appendAuditEntry(request, result);
    return result;
  }

  // 5. Local-safe allowlist — provider/folder/config operations (checked before readOnly so
  //    embedded-brain requests with "summarize" in intent classify as localSafe, not readOnly)
  if (LOCAL_SAFE_PATTERNS.some((rx) => rx.test(haystack))) {
    const reasons: string[] = ["Request matches local-safe allowlist."];
    if (/kcxmodeai|embedded|brain/i.test(haystack)) {
      reasons.push("Local embedded KCxModeAI provider — contained, local-only.");
    }
    const result: SERAPolicyResult = {
      decision: "allow",
      actionType: "localSafe",
      reasons,
      requiredApprovals: [],
      safeSummary: "Local-safe operation — allowed.",
    };
    _appendAuditEntry(request, result);
    return result;
  }

  // 6. Read-only — pure inspection/diagnostic; diagnostics removed from localSafe so this catches it
  if (READ_ONLY_PATTERNS.some((rx) => rx.test(haystack))) {
    const result: SERAPolicyResult = {
      decision: "allow",
      actionType: "readOnly",
      reasons: ["Request matches read-only diagnostic or inspection pattern."],
      requiredApprovals: [],
      safeSummary: "Read-only operation — allowed.",
    };
    _appendAuditEntry(request, result);
    return result;
  }

  // 7. Unknown — conservative default
  const result: SERAPolicyResult = {
    decision: "requireApproval",
    actionType: "unknown",
    reasons: ["Intent did not match any known safe or forbidden pattern — conservative approval required."],
    requiredApprovals: ["Manual operator approval"],
    safeSummary: "Unknown action — requires approval by default.",
  };
  _appendAuditEntry(request, result);
  return result;
}

// ─── Audit log ────────────────────────────────────────────────────────────────

const AUDIT_LOG_MAX = 200;
const _auditLog: SERALogEntry[] = [];

function _appendAuditEntry(request: SERARequest, result: SERAPolicyResult): void {
  const entry: SERALogEntry = {
    requestId: request.id,
    timestamp: new Date().toISOString(),
    source: request.source,
    proposedAction: request.proposedAction,
    decision: result.decision,
    actionType: result.actionType,
    reasons: result.reasons,
    blockedTokens: result.blockedTokens ?? [],
    requiredApprovals: result.requiredApprovals,
    finalStatus: "evaluated",
  };
  _auditLog.unshift(entry);
  if (_auditLog.length > AUDIT_LOG_MAX) {
    _auditLog.length = AUDIT_LOG_MAX;
  }
}

export function getAuditLog(): ReadonlyArray<SERALogEntry> {
  return _auditLog;
}

export function clearAuditLog(): void {
  _auditLog.length = 0;
}

// ─── Singleton convenience ────────────────────────────────────────────────────

export const seraEngine = { evaluate, getAuditLog, clearAuditLog };
