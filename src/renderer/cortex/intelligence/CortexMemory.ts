import type { SmartBrainTaskType, SmartBrainRiskLevel, CortexMemoryHints } from "./SmartBrainNormalizer";

export type { CortexMemoryHints };

export interface CortexMemoryEntry {
  ts: number;
  taskType: SmartBrainTaskType;
  riskLevel: SmartBrainRiskLevel;
  files: string[];
  projectName: string;
  rewriteRisk: boolean;
}

interface PersistedMemory {
  entries: CortexMemoryEntry[];
}

const STORAGE_KEY_PREFIX = "cortex-memory-v1";
const MAX_ENTRIES = 50;

function storageKey(projectKey: string): string {
  return `${STORAGE_KEY_PREFIX}:${projectKey}`;
}

class CortexMemoryStore {
  private entries: CortexMemoryEntry[] = [];
  private currentProjectKey = "default";
  private projectEntries: Record<string, CortexMemoryEntry[]> = {};

  constructor() {
    this.loadFromStorage();
    this.projectEntries[this.currentProjectKey] = this.entries;
  }

  setProjectKey(key: string) {
    const normalized = key.trim() || "default";
    if (normalized === this.currentProjectKey) return;
    // Flush current bucket into in-memory map and persist
    this.projectEntries[this.currentProjectKey] = this.entries;
    this.persistCurrentBucket();
    // Switch
    this.currentProjectKey = normalized;
    // Restore from in-memory bucket if present; otherwise try localStorage
    if (Object.prototype.hasOwnProperty.call(this.projectEntries, normalized)) {
      this.entries = this.projectEntries[normalized];
    } else {
      this.loadFromStorage();
      this.projectEntries[normalized] = this.entries;
    }
  }

  getProjectKey(): string {
    return this.currentProjectKey;
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(storageKey(this.currentProjectKey));
      if (!raw) { this.entries = []; return; }
      const parsed: PersistedMemory = JSON.parse(raw);
      this.entries = Array.isArray(parsed.entries) ? parsed.entries.slice(0, MAX_ENTRIES) : [];
    } catch {
      this.entries = [];
    }
  }

  private persistCurrentBucket() {
    try {
      const payload: PersistedMemory = { entries: this.entries };
      localStorage.setItem(storageKey(this.currentProjectKey), JSON.stringify(payload));
    } catch {}
  }

  record(entry: CortexMemoryEntry) {
    this.entries = [entry, ...this.entries].slice(0, MAX_ENTRIES);
    this.projectEntries[this.currentProjectKey] = this.entries;
    this.persistCurrentBucket();
  }

  getFileWeights(): Record<string, number> {
    const weights: Record<string, number> = {};
    for (const entry of this.entries) {
      for (const file of entry.files) {
        weights[file] = (weights[file] ?? 0) + 1;
      }
    }
    return weights;
  }

  getTopFiles(n: number): string[] {
    const weights = this.getFileWeights();
    return Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([file]) => file);
  }

  getRecentTaskTypes(n: number): SmartBrainTaskType[] {
    return this.entries.slice(0, n).map((e) => e.taskType);
  }

  getRiskFraction(): number {
    if (this.entries.length === 0) return 0;
    const recent = this.entries.slice(0, 20);
    const risky = recent.filter((e) => e.riskLevel === "Risky" || e.riskLevel === "Medium").length;
    return risky / recent.length;
  }

  getHints(): CortexMemoryHints {
    return {
      topFiles: this.getTopFiles(6),
      recentTaskTypes: this.getRecentTaskTypes(10),
      riskFraction: this.getRiskFraction(),
    };
  }

  getDiagnostics(): string {
    const weights = this.getFileWeights();
    const topFiles = Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([f, c]) => `${f.split("/").pop()}(${c})`)
      .join(", ");
    const recentTypes = this.getRecentTaskTypes(5).join(", ");
    const riskFraction = this.getRiskFraction().toFixed(2);
    return `[CortexMemory] ${this.entries.length} entries | Top files: ${topFiles || "none"} | Recent types: ${recentTypes || "none"} | Risk fraction: ${riskFraction}`;
  }

  getEntries(): readonly CortexMemoryEntry[] {
    return this.entries;
  }

  clear() {
    this.entries = [];
    this.projectEntries[this.currentProjectKey] = [];
    try { localStorage.removeItem(storageKey(this.currentProjectKey)); } catch {}
  }
}

export const cortexMemory = new CortexMemoryStore();
