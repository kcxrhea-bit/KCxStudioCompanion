import { cortexEventBus } from "./CortexEventBus";
import { canActivateBridge } from "./CortexPermissions";
import { CortexBridge, CortexPermissionLevel, CortexSystemId } from "./types";

export const createBridge = (
  id: CortexSystemId,
  label: string,
  permission: CortexPermissionLevel = "read-only",
  readiness = 0,
  bridgeCategory: CortexBridge["bridgeCategory"] = "runtime",
  runtimeDependency = "Local runtime unavailable",
  activationBlockedReason = "Operator approval required",
  activationPath = "Manual operator activation"
): CortexBridge => ({
  id,
  label,
  state: "disconnected",
  permission,
  readonly: true,
  lastActivityAt: null,
  readiness,
  bridgeCategory,
  runtimeDependency,
  activationBlockedReason,
  activationPath
});

export const activateBridge = (bridge: CortexBridge): CortexBridge => {
  if (!canActivateBridge(bridge)) {
    cortexEventBus.emit("permission-updated", `Permission denied for bridge activation: ${bridge.label}`, { bridgeId: bridge.id });
    return bridge;
  }
  const next = { ...bridge, state: "connected" as const, lastActivityAt: new Date().toISOString() };
  cortexEventBus.emit("bridge-state-changed", `Bridge activated: ${bridge.label}`, { bridgeId: bridge.id });
  return next;
};

export const deactivateBridge = (bridge: CortexBridge): CortexBridge => {
  const next = { ...bridge, state: "disconnected" as const, lastActivityAt: new Date().toISOString() };
  cortexEventBus.emit("bridge-state-changed", `Bridge deactivated: ${bridge.label}`, { bridgeId: bridge.id });
  return next;
};
