import { cortexEventBus } from "./CortexEventBus";
import { CortexProvider, CortexProviderType, CortexRuntimeState } from "./types";

export const createCortexProvider = (
  id: string,
  type: CortexProviderType,
  label: string,
  capabilities: string[],
  state: CortexRuntimeState = "dormant",
  readiness = 0,
  providerCategory: CortexProvider["providerCategory"] = "analysis",
  runtimeAvailability = "unavailable",
  activationBlockedReason = "Operator approval required",
  activationPath = "Manual operator activation",
  dependencyRequirement = "Provider bridge disconnected",
  containmentState = "contained"
): CortexProvider => ({
  id,
  type,
  label,
  state,
  capabilities,
  available: false,
  readiness,
  providerCategory,
  runtimeAvailability,
  activationBlockedReason,
  activationPath,
  dependencyRequirement,
  containmentState,
  readonly: true
});

export const registerProvider = (providers: CortexProvider[], provider: CortexProvider) => {
  const next = providers.some((entry) => entry.id === provider.id) ? providers : [...providers, provider];
  cortexEventBus.emit("provider-registered", `Provider registered: ${provider.label}`, { providerId: provider.id });
  return next;
};
