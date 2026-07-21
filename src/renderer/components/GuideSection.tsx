import React from "react";

/**
 * GuideSection — built-in manual for KCx Studio Companion.
 *
 * Content generated from a full interactive + source-level architecture audit
 * (2026-07-21). Every statement here reflects verified runtime behavior or
 * implementation read directly from the source. Uses only existing design
 * classes (card, panel-secondary, grid-2, chip, status, details) — no new CSS.
 */

const G = ({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) => (
  <details className="card" open={open}>
    <summary><strong>{title}</strong></summary>
    <div>{children}</div>
  </details>
);

export function GuideSection() {
  return (
    <section className="guide-page">
      <h3 className="title">Guide — KCx Studio Companion Manual</h3>
      <p className="subtle">Built-in reference generated from a full architecture audit (v0.9.5-beta, 2026-07-21). Everything below describes what the app actually does today.</p>

      <G title="Overview" open>
        <p>KCx Studio Companion is a local-first orchestration environment for desktop builds, prompt chains, project memory, and safe workflow review. It never sends prompts anywhere on its own: AI prompts are generated locally, reviewed in the Approval Queue, and handed off to Claude Code / Codex by manual copy-paste. Commands only run after explicit approval, through a safety validator.</p>
        <p>The app has two faces: <strong>Companion</strong> (the workflow screens in the left nav) and <strong>Valhalla</strong> (a cinematic systems map with the Cortex chamber). Both share one Cortex runtime living in the renderer.</p>
      </G>

      <G title="Getting Started — how to use the app" open>
        <p><strong>1. Register a project.</strong> Projects → enter name + full folder path (e.g. <code>D:\KCxProjects\MyApp</code>), pick a type and phase → Add Project. Then pick it in the header's Select Project dropdown — every screen operates on the selected project.</p>
        <p><strong>2. Scan it.</strong> Project Context → Scan Project. This detects frameworks and folders, and grounds all future prompts in your real file structure.</p>
        <p><strong>3. Fill in Project Memory.</strong> Add the goal, important files, protected files, and do-not-rewrite rules. These are injected into every generated prompt as safety rules — the better this is, the safer the prompts.</p>
        <p><strong>4. Run a build.</strong> Build Logs → Presets → pick a tile (e.g. Android Debug Build or Node Build) → RUN BUILD. The command lands in the Approval Queue; press Approve &amp; Execute there to actually run it. Output streams into Telemetry and merges into your build logs.</p>
        <p><strong>5. Analyze failures.</strong> Back in Build Logs, press Analyze Logs (or paste/import a log first). The classifier identifies the failure type, then use Generate Fix Prompt → the prompt appears in the Approval Queue.</p>
        <p><strong>6. Hand off to Claude Code.</strong> In the Approval Queue, open the prompt card → Copy Prompt + Mark Sent → paste into Claude Code/Codex. When the patch comes back, paste its summary into Patch Review, and generate Validation/Regression prompts to close the loop.</p>
        <p><strong>7. Try Spec Intake.</strong> With a project selected, Enter Valhalla → click the KCx Cortex node → Enter Chamber → Spec Intake → describe a feature in plain English → Generate Implementation Prompt. The structured prompt lands in the Approval Queue. (Optional: enable Ollama in AI Providers first for model-guided output; otherwise the embedded brain answers.)</p>
      </G>

      <G title="Architecture">
        <p><strong>Stack:</strong> Electron 33 + React 18 + TypeScript + Vite 6. Strict process separation: main process (<code>src/main/main.ts</code>, <code>release.ts</code>), preload bridge (<code>src/preload/preload.ts</code> exposing <code>window.kcxApi</code>, contextIsolation on, nodeIntegration off), renderer (<code>src/renderer/</code>).</p>
        <p><strong>Renderer shell:</strong> <code>App.tsx</code> is a deliberate monolith (~1,600 lines) holding all Companion state, handlers, and tab rendering. Valhalla is a separate module (<code>renderer/valhalla/</code>). Cortex is a renderer-side subsystem (<code>renderer/cortex/</code>) built around a singleton <code>cortexRuntime</code> and a <code>cortexEventBus</code>.</p>
        <p><strong>Routing:</strong> there is no router. The Companion left nav sets a <code>tab</code> string; each screen is conditionally rendered. <code>showValhalla</code> swaps the entire page to Valhalla.</p>
        <p><strong>IPC channels:</strong> state:get, state:save, app:releaseInfo, diagnostics:clear-logs, cmd:run (streams build-output-line events back), provider:test, project:scan, src:tree (depth-limited source tree), ollama:start, ollama:stop.</p>
      </G>

      <G title="Application Map">
        <p><strong>Companion nav:</strong> Dashboard, Projects, Project Memory | Approval Queue, AI Providers | Build Logs, Patch Review, Project Context, Session Timeline | Settings, Telemetry | Guide, About, Release Notes, First Launch, Product Foundation. In development builds only: Development Tools, Ecosystem Test.</p>
        <p><strong>Valhalla:</strong> Enter Valhalla (top of nav) opens the ForgeCanvas systems map with sector tabs Forge, Systems, Runtime, Memory, AI, Devices, a right-hand inspector, dev logs, and the KCx Cortex chamber (Forge Bay overlay).</p>
        <p><strong>Header:</strong> the Ecosystem Dock (K-Drone / Wolf-Core / X-Pod tiles) is a visual status modal; the Select Project dropdown drives which project every workflow screen operates on.</p>
      </G>

      <G title="Screens — what each one does">
        <p><strong>Dashboard:</strong> System Status Panel — active project + risk level, approval queue counts, last build result (from build intelligence regexes), enabled-provider count.</p>
        <p><strong>Projects:</strong> register a project (name, path, type, goal, phase Idea→Finalize) and delete projects. Project types: Android App, Desktop App, Website, Game / Addon, 3D Print / Maker, Robotics / Electronics, General Project.</p>
        <p><strong>Project Memory:</strong> per-project long-term memory — goal, important files, protected files, do-not-rewrite rules, workflow notes. Saved on every keystroke into app state; injected as a safety block into every generated prompt.</p>
        <p><strong>Approval Queue:</strong> the review gate. Prompt cards (Fix / Validation / Regression / Spec Intake) support Approve, Reject, Copy, Mark Sent ("manual handoff to Claude Code"), Mark Completed/Failed, Delete. Command cards show Approve &amp; Execute, which actually runs the command. Spec-intake cards carry risk badges and an expandable Normalization Trace.</p>
        <p><strong>AI Providers:</strong> three providers — Local KCx Brain (embedded, always connected), Codex Handoff (manual copy/paste channel), Ollama (localhost endpoint, phi3:latest). Routing Matrix maps 8 task hooks to providers. Enabling Ollama here asks the main process to spawn <code>ollama serve</code> and enables the Cortex summarize adapter.</p>
        <p><strong>Build Logs:</strong> the build cockpit — preset tile panel (Android, Node/NPM, Electron, Project Root, ADB, Git, Tools, Reset — 100+ presets), command input, RUN BUILD (queues an approval, does not run directly), log paste/import, Analyze Logs (heuristic classifier), and the three prompt generators.</p>
        <p><strong>Patch Review:</strong> paste a patch summary from Claude Code/Codex; heuristics extract changed files, risky wording, build outcome, and a recommended next step.</p>
        <p><strong>Project Context:</strong> Scan Project walks the project folder (skipping node_modules/.git/dist/build/out) and detects frameworks, build systems, file counts, and size. Feeds Cortex context and Spec Intake grounding.</p>
        <p><strong>Session Timeline:</strong> persisted event history with filters (prompts, builds, commands, scans, failures, completed work).</p>
        <p><strong>Settings:</strong> theme switcher (Grid Zero / default dark), project root + gradle wrapper paths, production toggles (diagnostics, telemetry, experimental, backup-on-save), Cortex Auto-Queue, settings export, Clear All Logs, Fresh Start (destructive — wipes session data, keeps projects/memory/settings), and the KCx Ecosystem Reference art.</p>
        <p><strong>Telemetry:</strong> in-memory session feed (last 8 events) with level filters and the status-indicator legend. Cleared on restart; distinct from the persisted timeline.</p>
        <p><strong>About / Release Notes / First Launch / Product Foundation:</strong> product info, changelog, onboarding summary, and license/entitlement placeholders for future paid features.</p>
      </G>

      <G title="Workflows">
        <p><strong>Startup:</strong> main loads state JSON defensively (backup restore, clean fallback + dialog). Renderer normalizes/migrates state, restores last selected project, initializes Cortex, saves back.</p>
        <p><strong>Project selection:</strong> header dropdown → persists lastSelectedProjectId, restores the project's build command + preset, re-emits Cortex project context.</p>
        <p><strong>Build execution:</strong> RUN BUILD parses the command (handles <code>cd /d "path" &amp;&amp; …</code> chains and <code>start "" "path"</code>), queues a command approval → Approve &amp; Execute → main validates via commandSafety (blocks shell interpreters, dangerous commands, control characters, destructive git) → spawns with live output streamed to Telemetry and Cortex.</p>
        <p><strong>Log analysis → prompt chain:</strong> Analyze Logs classifies errors (Kotlin, TS, missing module/symbol, Room/KSP, Compose, Gradle, manifest, Electron/Vite/npm) → Generate Fix / Validation / Regression prompts, each with per-issue-type instructions, project-memory safety block, protected-file collision warnings, and duplicate-prompt prevention. Prompts chain by analysis id in the queue.</p>
        <p><strong>Spec Intake (Cortex chamber):</strong> plain-English spec → SmartBrain normalizer (sanitizes risky phrasing, classifies task type + risk, records a trace) → if Ollama is enabled: grounded prompt including the real src/ tree (depth ≤ 4) runs through the manual execution queue + sandbox; otherwise the embedded KCxModeAI brain answers; final fallback is the rule-based structured prompt. Result lands in the Approval Queue. <strong>A project must be selected</strong> — without one the result is silently discarded (known gap).</p>
        <p><strong>Cortex build loop:</strong> after a failed build analysis, if Ollama is enabled, Cortex auto-creates, approves, and executes a read-only summarize request; with Cortex Auto-Queue on, a Fix prompt is queued automatically. You still approve manually before anything leaves the app.</p>
        <p><strong>Packaging:</strong> <code>npm run build</code> (tsc for main/preload + vite for renderer) then <code>npm run dist</code> (electron-builder → NSIS installer + portable exe in <code>release/</code>).</p>
      </G>

      <G title="Cortex — truthful status">
        <p>Cortex is real but deliberately contained. What exists today: the runtime singleton with providers/bridges registries (6 providers, 19 bridges), event bus, timeline, SmartBrain normalizer, KCxSERA policy scanner (forbidden-token + high-risk pattern gates), the manual execution queue with fail-closed sandbox (summarize-only purposes; shell, file writes, patch application, background loops all denied), Ollama + embedded-brain adapters, and the Spec Intake pipeline described above.</p>
        <p>What is intentionally not wired: provider execution beyond read-only summaries, bridge execution, autonomous orchestration, memory routing, external runtime control. Activation requests are always denied by design — ATTEMPT ACTIVATION is a simulation of the future operator-approval flow. The chamber labels itself "frontend-only and read-only"; that matches the code.</p>
        <p>External ecosystem bridges (KCxMode Android, Robot Buddy, KCx Site, Messenger Desktop, etc.) are honest placeholders at 0% readiness. Readiness percentages for internal bridges derive from actual runtime context (brain availability, telemetry, build context, memory entries).</p>
      </G>

      <G title="Valhalla">
        <p>Valhalla is a full-page mode (ForgeCanvas on ReactFlow) showing the KCx ecosystem: sectors Creation Forge, Runtime Nexus, Cortex Core, Memory Vault, AI Systems, Device Grid; nodes for Studio Companion, Valhalla Systems, KCx Mode, KCx Messenger, KCx Cortex, Local AI, Cloud AI, GodzillaMode AI, Robot Buddy. Node activity state derives from the live Cortex snapshot; positions are static (no live topology). Inspector actions deep-link back into Companion screens (e.g. Memory Vault → Project Memory). The Cortex chamber opens from the KCx Cortex node.</p>
      </G>

      <G title="Storage locations">
        <p><strong>App state:</strong> <code>%APPDATA%/kcx-studio-companion/kcx-studio-companion-state.json</code> (atomic .tmp+rename writes, .bak backup, recovery dialog on corruption). Holds projects, memory, approvals, timeline, providers, routing, settings, license.</p>
        <p><strong>Diagnostics:</strong> <code>userData/logs/runtime.log</code> (main-process append-only log).</p>
        <p><strong>localStorage:</strong> <code>kcx-studio-theme</code> (theme choice), <code>cortex-runtime-config</code> (Ollama enablement). Session telemetry and Cortex timeline/dev logs are in-memory only.</p>
      </G>

      <G title="Developer notes">
        <p><strong>Dev startup:</strong> <code>npm run dev</code> — concurrently runs tsc watch (main), Vite on 127.0.0.1:5173, and Electron once both are ready. DevTools opens detached. React StrictMode double-mounts effects in dev (hence the doubled "App/session initialized" telemetry entry).</p>
        <p><strong>Validation:</strong> <code>npm run build</code> must pass clean; <code>npm test</code> runs the Jest suites in <code>tests/</code> (ts-jest, node environment). Windows-first: commands use npm.cmd / gradlew.bat / cd /d; the runner uses child_process, so PowerShell 5.1 quirks don't apply.</p>
        <p><strong>Conventions:</strong> surgical patches only (see <code>.agent.md</code>); preserve App.tsx orchestration; docs live in <code>docs/</code> as dated audit files; CLAUDE.md carries agent-facing architecture notes.</p>
      </G>

      <G title="Troubleshooting">
        <p><strong>Spec Intake produces nothing:</strong> select a project first — the queue subscriber drops results when no project is selected.</p>
        <p><strong>Ollama features unavailable:</strong> enable Ollama in AI Providers (this also attempts to start <code>ollama serve</code>); the model default is phi3:latest on 127.0.0.1:11434. The app does not check Ollama liveness at launch.</p>
        <p><strong>Command blocked:</strong> the safety validator rejects shell control characters, whitespace-in-command, shell interpreters, and destructive commands (rm/del/format/reg/…, git reset --hard, git clean -f). Use presets or plain command + args.</p>
        <p><strong>State corrupted:</strong> the app auto-restores from .bak; if that fails it starts clean and tells you. Export Settings (Settings → Backup Options) copies the full state JSON to your clipboard.</p>
      </G>

      <G title="Known limitations">
        <p>Prompt delivery is manual copy/paste — the app cannot send prompts to Claude/Codex on your behalf. STOP during builds is not wired (no process cancellation). ForgeCanvas layout is static. External app bridges are placeholders. Spec Intake requires a selected project but does not say so when none is selected. The "Run From Root" and "Open Terminal" presets currently generate malformed switches (<code>cd d</code> / <code>cmd k</code> — missing the forward slash). The Prompt Generator tab was removed in v0.9.5 and will return when the generation pipeline is wired to it.</p>
      </G>

      <G title="Roadmap markers">
        <p>Marked in code and release notes as future work: Cortex provider execution and bridge activation behind operator approval (activation gate exists, always denies today), local model routing beyond summaries, external ecosystem bridge connections, automated prompt delivery, build cancellation, plugin marketplace / account integration / update channels (Product Foundation), and the return of the Prompt Generator.</p>
      </G>
    </section>
  );
}
