/**
 * Single source of truth for the Ollama "inference ready" state shown in the UI.
 *
 * The Cortex chamber header derives its readiness copy from
 * `snapshot.localExecution.activeExecution`, which is the live Ollama adapter
 * readiness. The status chip previously used a separate `ollamaLive` React
 * state that was only updated by `cortex-status-changed` events, so it went
 * stale whenever readiness changed through a path that refreshed the snapshot
 * without emitting that event (for example "Enable Local Ollama").
 *
 * Both surfaces now resolve through these helpers so they cannot diverge.
 */

export interface OllamaReadinessSource {
  localExecution: {
    activeExecution: boolean;
  };
}

export interface OllamaChipState {
  live: boolean;
  label: "Live" | "Dormant";
  pillClass: "status-active" | "status-dormant";
}

/** True when the local Ollama adapter is enabled and inference is ready. */
export function isOllamaInferenceReady(snapshot: OllamaReadinessSource | null | undefined): boolean {
  return Boolean(snapshot?.localExecution?.activeExecution);
}

/** Presentation state for the Ollama status chip. */
export function resolveOllamaChipState(inferenceReady: boolean): OllamaChipState {
  return inferenceReady
    ? { live: true, label: "Live", pillClass: "status-active" }
    : { live: false, label: "Dormant", pillClass: "status-dormant" };
}

/** Readiness copy used by the Cortex chamber header. */
export function resolveCortexChamberReadiness(inferenceReady: boolean): string {
  return inferenceReady
    ? "active / Build loop operational | Inference ready"
    : "active / Ollama offline — build loop paused | Awaiting model";
}
