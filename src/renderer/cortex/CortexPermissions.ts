import { CortexBridge, CortexPermissionLevel, CortexProvider } from "./types";

const blocked: CortexPermissionLevel[] = ["disabled", "restricted"];

export const canActivateBridge = (bridge: CortexBridge) =>
  !bridge.readonly && !blocked.includes(bridge.permission);

export const canRouteEvent = (permission: CortexPermissionLevel) =>
  permission !== "disabled";

export const canAccessProvider = (provider: CortexProvider, permission: CortexPermissionLevel) =>
  provider.available && !blocked.includes(permission);

export const getActivationBlockedReason = (targetType: "provider" | "bridge") => {
  if (targetType === "provider") return "Provider dependency unresolved";
  return "Runtime containment active";
};
