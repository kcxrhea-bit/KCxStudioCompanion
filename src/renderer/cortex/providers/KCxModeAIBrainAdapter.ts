import { GodzillaAiBrain } from "./kcxmodeai/godzillaBrain";

export interface KCxBrainResponse {
  title: string;
  responseText: string;
  bullets?: string[];
  suggestedActions?: string[];
  source: "kcxmodeai-brain";
}

const EMPTY_PROMPT_RESPONSE: KCxBrainResponse = {
  title: "No Input",
  responseText: "No prompt was provided. Please enter a request to continue.",
  bullets: [],
  suggestedActions: ["Enter a prompt to get started."],
  source: "kcxmodeai-brain",
};

export class KCxModeAIBrainAdapter {
  private brain = new GodzillaAiBrain();

  generate(prompt: string): KCxBrainResponse {
    if (!prompt.trim()) {
      return EMPTY_PROMPT_RESPONSE;
    }

    const result = this.brain.generate({
      input: prompt,
      memory: [],
      providerId: "rule-based",
    });

    return {
      title: result.title,
      responseText: result.responseText,
      bullets: result.bullets,
      suggestedActions: result.suggestedActions,
      source: "kcxmodeai-brain",
    };
  }
}

export const kcxModeAIBrainAdapter = new KCxModeAIBrainAdapter();
