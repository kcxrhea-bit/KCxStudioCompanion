import type { CortexBridge, CortexProviderTelemetry, KCxModeAIBrainDiagnostics } from "../types";

export interface BridgeReadinessContext {
  embeddedBrain: KCxModeAIBrainDiagnostics;
  telemetry: CortexProviderTelemetry;
  buildContextAvailable: boolean;
  projectMemoryEntries: number;
  ollamaEnabled: boolean;
}

/**
 * Returns updated readiness/status fields for a bridge based on live runtime context.
 * Pure function — no side effects. Returns only the fields that should change.
 */
export function deriveBridgeReadinessFromSnapshot(
  bridge: CortexBridge,
  ctx: BridgeReadinessContext
): Partial<CortexBridge> {
  switch (bridge.id) {
    case "kcxmodeai": {
      if (ctx.embeddedBrain.embeddedBrainAvailable) {
        return {
          readiness: ctx.ollamaEnabled ? 85 : 78,
          activationBlockedReason: ctx.ollamaEnabled
            ? "Local brain integrated — Ollama active"
            : "Local brain integrated — Ollama offline, brain fallback active",
          activationPath: "Local brain integrated",
        };
      }
      return {
        readiness: 10,
        activationBlockedReason: "Embedded brain unavailable",
        activationPath: "Setup required",
      };
    }

    case "project-memory": {
      if (ctx.projectMemoryEntries > 0) {
        return {
          readiness: 45,
          activationBlockedReason: `Memory entries present (${ctx.projectMemoryEntries})`,
          activationPath: "Memory entries available — activation locked",
        };
      }
      return {
        readiness: 12,
        activationBlockedReason: "No project memory entries",
        activationPath: "Manual operator activation",
      };
    }

    case "build-telemetry": {
      const totalAttempts = Object.values(ctx.telemetry.providerAttemptCounts).reduce((a, b) => a + b, 0);
      const totalSuccesses = Object.values(ctx.telemetry.providerSuccessCounts).reduce((a, b) => a + b, 0);
      if (totalAttempts > 0) {
        return {
          readiness: 42,
          activationBlockedReason: `Telemetry active — ${totalAttempts} attempts, ${totalSuccesses} successes`,
          activationPath: "Local telemetry accumulating",
        };
      }
      return {
        readiness: 8,
        activationBlockedReason: "No telemetry data yet",
        activationPath: "Local runtime initialization",
      };
    }

    case "studio-companion-analysis": {
      if (ctx.buildContextAvailable) {
        return {
          readiness: 28,
          activationBlockedReason: "Diagnostics available — not connected",
          activationPath: "Display-only / not connected",
        };
      }
      return {
        readiness: 8,
        activationBlockedReason: "No recent build — diagnostics inactive",
        activationPath: "Run a build to populate diagnostics",
      };
    }

    case "valhalla-runtime": {
      return {
        readiness: 32,
        activationBlockedReason: "Valhalla runtime session active — execution locked",
        activationPath: "Display-only / not connected",
      };
    }

    // Ecosystem bridges — external apps
    case "kcxmode-android":
    case "robot-buddy":
    case "ringer-restore":
    case "kcx-site":
    case "kcx-translator":
    case "dino-holo-friend":
    case "after-earth":
    case "easy-launcher":
    case "pc-streamer":
      return {
        readiness: 0,
        activationBlockedReason: "External app dormant — bridge not configured",
        activationPath: "Future bridge target",
      };

    case "messenger-desktop":
      return {
        readiness: 5,
        activationBlockedReason: "Display-only / not connected",
        activationPath: "Manual operator activation",
      };

    default:
      return {};
  }
}
