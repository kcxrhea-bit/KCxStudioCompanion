export type CommandSafetyRequest = {
  command?: unknown;
  args?: unknown;
  cwd?: unknown;
};

export type CommandSafetyResult = {
  ok: boolean;
  reason?: string;
};

const shellControlPattern = /[;&|<>`$]/;
const dangerousCommands = new Set([
  "rm",
  "rmdir",
  "rd",
  "del",
  "erase",
  "format",
  "diskpart",
  "shutdown",
  "bcdedit",
  "reg",
  "sc",
  "takeown",
  "icacls",
]);
const shellInterpreterCommands = new Set([
  "cmd",
  "cmd.exe",
  "powershell",
  "powershell.exe",
  "pwsh",
  "pwsh.exe",
  "bash",
  "bash.exe",
  "sh",
  "sh.exe",
  "wscript",
  "wscript.exe",
  "cscript",
  "cscript.exe",
  "mshta",
  "mshta.exe",
]);

const commandName = (command: string): string => {
  const normalized = command.replace(/\\/g, "/").split("/").pop() || "";
  return normalized.toLowerCase();
};

export const validateCommandRequest = (request: CommandSafetyRequest): CommandSafetyResult => {
  if (!request || typeof request.command !== "string") {
    return { ok: false, reason: "Command must be a string." };
  }

  const command = request.command.trim();
  if (!command) return { ok: false, reason: "Command is empty." };
  if (shellControlPattern.test(command) || /\s/.test(command)) {
    return { ok: false, reason: "Command contains shell control characters or whitespace." };
  }

  const args = Array.isArray(request.args) ? request.args : [];
  if (!Array.isArray(request.args)) return { ok: false, reason: "Command args must be an array." };
  if (args.some((arg) => typeof arg !== "string")) {
    return { ok: false, reason: "Command args must be strings." };
  }
  if (args.some((arg) => shellControlPattern.test(arg))) {
    return { ok: false, reason: "Command args contain shell control characters." };
  }
  if (request.cwd !== undefined && typeof request.cwd !== "string") {
    return { ok: false, reason: "Command working directory must be a string." };
  }

  const name = commandName(command);
  if (dangerousCommands.has(name)) {
    return { ok: false, reason: `Blocked dangerous command: ${name}.` };
  }
  if (shellInterpreterCommands.has(name)) {
    return { ok: false, reason: `Blocked shell interpreter command: ${name}.` };
  }

  const lowerArgs = args.map((arg) => arg.toLowerCase());
  if (name === "git" || name === "git.exe") {
    if (lowerArgs[0] === "reset" && lowerArgs.includes("--hard")) {
      return { ok: false, reason: "Blocked destructive git reset --hard." };
    }
    if (lowerArgs[0] === "clean" && lowerArgs.some((arg) => /^-.*f/.test(arg))) {
      return { ok: false, reason: "Blocked destructive git clean force operation." };
    }
  }

  return { ok: true };
};

