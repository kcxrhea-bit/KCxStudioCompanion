import { AppState, BuildIntelligence, TimelineEvent } from "../types";

const emptyBuildIntel = (): BuildIntelligence => ({
  buildSuccessful: false,
  buildFailed: false,
  kotlinCompileErrors: 0,
  typescriptErrors: 0,
  gradleErrors: 0,
  missingDependencyErrors: 0,
});

export const clearSystemLogs = (state: AppState, completedEvent: TimelineEvent): AppState => ({
  ...state,
  projects: state.projects.map((project) => ({
    ...project,
    buildLogs: "",
    buildStatus: project.buildStatus === "Running" ? "Waiting Approval" : project.buildStatus,
    buildIntel: emptyBuildIntel(),
    buildLogHistory: [],
    commandHistory: [],
    patchReviewHistory: [],
  })),
  approvals: state.approvals.filter((approval) => approval.kind !== "command" || approval.status === "pending"),
  timeline: [completedEvent],
  aiDecisionTrace: [],
  safetyWarnings: [],
});
