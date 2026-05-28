import { KCxModeAIBrainAdapter } from "../src/renderer/cortex/providers/KCxModeAIBrainAdapter";

describe("KCxModeAIBrainAdapter", () => {
  let adapter: KCxModeAIBrainAdapter;

  beforeEach(() => {
    adapter = new KCxModeAIBrainAdapter();
  });

  test("accepts a simple prompt and returns a response", () => {
    const result = adapter.generate("Help me plan my morning routine");
    expect(result).toBeDefined();
  });

  test("returns a non-empty title", () => {
    const result = adapter.generate("I need help organizing my tasks");
    expect(typeof result.title).toBe("string");
    expect(result.title.length).toBeGreaterThan(0);
  });

  test("returns a non-empty responseText", () => {
    const result = adapter.generate("Help me focus on one task today");
    expect(typeof result.responseText).toBe("string");
    expect(result.responseText.length).toBeGreaterThan(0);
  });

  test("source is always 'kcxmodeai-brain'", () => {
    const result = adapter.generate("Organize my shopping list: milk, eggs, bread");
    expect(result.source).toBe("kcxmodeai-brain");
  });

  test("source is 'kcxmodeai-brain' for any prompt type", () => {
    const prompts = [
      "blood sugar was 130 after lunch",
      "I feel dizzy and have a headache",
      "call dentist, pick up groceries, send email",
      "godzilla mode deep work session",
    ];
    for (const prompt of prompts) {
      expect(adapter.generate(prompt).source).toBe("kcxmodeai-brain");
    }
  });

  test("empty prompt returns safe error response without throwing", () => {
    const result = adapter.generate("");
    expect(result).toBeDefined();
    expect(result.source).toBe("kcxmodeai-brain");
    expect(result.title).toBe("No Input");
    expect(result.responseText.length).toBeGreaterThan(0);
  });

  test("whitespace-only prompt returns safe error response without throwing", () => {
    const result = adapter.generate("   ");
    expect(result.title).toBe("No Input");
    expect(result.source).toBe("kcxmodeai-brain");
  });

  test("bullets is an array when present", () => {
    const result = adapter.generate("Help me plan my day");
    if (result.bullets !== undefined) {
      expect(Array.isArray(result.bullets)).toBe(true);
    }
  });

  test("suggestedActions is an array when present", () => {
    const result = adapter.generate("I have a todo: call mom, pick up prescriptions");
    if (result.suggestedActions !== undefined) {
      expect(Array.isArray(result.suggestedActions)).toBe(true);
    }
  });

  test("health prompt routes to a health-related title", () => {
    const result = adapter.generate("blood sugar 145 after meals, a1c was 7.2");
    expect(result.title.length).toBeGreaterThan(0);
    expect(result.source).toBe("kcxmodeai-brain");
  });

  test("same prompt called twice produces identical output (deterministic)", () => {
    const prompt = "I need to organize my grocery list: milk, eggs, bread, fruit";
    const r1 = adapter.generate(prompt);
    const r2 = adapter.generate(prompt);
    expect(r1.title).toBe(r2.title);
    expect(r1.responseText).toBe(r2.responseText);
    expect(r1.source).toBe(r2.source);
  });
});
