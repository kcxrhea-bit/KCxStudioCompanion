import type { CortexExecutionStatus } from "./CortexExecutionTypes";

export interface CortexExecutionResult {
  id: string;
  requestId: string;
  providerId: string;
  status: CortexExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  sandboxAllowed: boolean;
  output?: string;
  blockedReasons: string[];
  warnings: string[];
  error?: string;
}
