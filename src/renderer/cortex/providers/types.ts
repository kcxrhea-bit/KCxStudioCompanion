// Minimal type shim for the kcxmodeai brain modules.
// Only the types actually consumed by godzillaBrain.ts are declared here.

export type ProviderId = "rule-based" | "ollama" | "openai" | "gemini" | "claude";

export type BrainIntent =
  | "health_summary"
  | "blood_sugar"
  | "a1c"
  | "medicine_log"
  | "symptom_note"
  | "doctor_report"
  | "messy_notes"
  | "shopping_text"
  | "todo_text"
  | "focus_support"
  | "family_support"
  | "senior_support"
  | "godzilla_planning"
  | "general";

export type MemoryCategory =
  | "health_context"
  | "blood_sugar"
  | "medicine"
  | "symptom"
  | "shopping"
  | "task"
  | "godzilla_mode_setting"
  | "note"
  | "safe_note"
  | "user_preference";

export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  tags?: string[];
}

export interface StructuredAiResponse {
  type: string;
  title: string;
  responseText: string;
  bullets: string[];
  suggestedActions: string[];
  safetyLevel: "normal" | "info" | "caution" | "urgent";
  memoryUpdates?: string[];
}

// Additional types referenced by other kcxmodeai modules (not used by the adapter
// directly, but present so imports in sibling files resolve without error).
export type LocalAiSettings = {
  providerMode: "rule_based" | "ollama";
  ollama: {
    enabled: boolean;
    baseUrl: string;
    selectedModel: string;
    availableModels: string[];
    lastStatus: string;
    lastCheckedAt: string | null;
    errorMessage: string;
  };
  context: {
    contextMode: string;
    maxContextMessages: number;
    allowConversationTitles: boolean;
    allowTaskContext: boolean;
    allowNotesContext: boolean;
    allowMemoryHighlights: boolean;
  };
};

export type OllamaStatus = {
  available: boolean;
  models?: string[];
};

// AppData and AppInfo are used only by defaults.ts which is not imported by the adapter.
// Declared as opaque to satisfy any transitive import without pulling in the full shape.
export type AppData = Record<string, unknown>;
export type AppInfo = Record<string, unknown>;
