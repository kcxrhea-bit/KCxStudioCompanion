import { cortexExecutionPermissions } from "../src/renderer/cortex/execution/CortexExecutionPermissions";
import { CortexExecutionSandbox } from "../src/renderer/cortex/execution/CortexExecutionSandbox";
import { CortexManualExecutionQueue } from "../src/renderer/cortex/execution/CortexManualExecutionQueue";
import type { CortexManualExecutionRequest, CortexProviderAdapterReadiness } from "../src/renderer/cortex/execution/CortexExecutionTypes";

const sandbox = new CortexExecutionSandbox();

describe("CortexExecutionPermissions summarize-safe classification", () => {
  const adapter: CortexProviderAdapterReadiness = {
    id: "ollama-provider-adapter",
    label: "Ollama",
    providerType: "local-ollama",
    capabilities: ["local_inference"],
    availability: "configured",
    readonly: false,
    requiresManualApproval: true,
    configured: true,
    enabled: true,
    endpointValid: true,
    blockedReason: ""
  };

  function makeRequest(prompt: string, purpose = "Summarize runtime readiness"): CortexManualExecutionRequest {
    return {
      id: "r1",
      providerId: "ollama-provider-adapter",
      prompt,
      purpose,
      createdAt: new Date().toISOString(),
      status: "pending-approval",
      requiresApproval: true,
      blockedReason: ""
    } as CortexManualExecutionRequest;
  }

  test("allows grounded Spec Intake prompts with npm.cmd run build and benign patch wording through the approval queue", () => {
    const queue = new CortexManualExecutionQueue(cortexExecutionPermissions, sandbox);
    const created = queue.createManualRequest({
      providerId: "ollama-provider-adapter",
      prompt: "Summarize the feature request and include verification: npm.cmd run build. Produce minimal patch instructions, one focused change at a time.",
      purpose: "Summarize feature specification into structured implementation guidance"
    });

    expect(created.status).toBe("pending-approval");

    const approved = queue.approveManualRequest(created.id, adapter);
    expect(approved?.status).toBe("approved");
    expect(approved?.blockedReason).toBe("");
  });

  test("still denies dangerous prompt content at approval time", () => {
    const queue = new CortexManualExecutionQueue(cortexExecutionPermissions, sandbox);
    const created = queue.createManualRequest({
      providerId: "ollama-provider-adapter",
      prompt: "Write files and delete content while summarizing the request.",
      purpose: "Summarize runtime readiness"
    });

    expect(created.status).toBe("pending-approval");

    const denied = queue.approveManualRequest(created.id, adapter);
    expect(denied?.status).toBe("blocked");
    expect(denied?.blockedReason).toContain("Only summarize-safe local requests can be approved.");
  });
});
