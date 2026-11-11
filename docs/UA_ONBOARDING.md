# Onboarding guide — LearnHarness

> Generated from the Understand-Anything knowledge graph (`knowledge-graph.json`, commit `713377f`).
> 439 analyzed files · 1,786 nodes · 5 architectural layers · 89 complexity hotspots.
> This guide describes what the code *is*. It is not a specification and not a promise of
> learning outcomes — for those, see [the teaching method](teaching-methodology.md).

---

## 1. Project overview

**LearnHarness** is a desktop + web application that teaches a subject by *measuring* where
your understanding actually ends, then building from there one reasoning step at a time.

It is **not** a chatbot with a tutoring prompt. The distinction shows up in the code:

- the learner answers questions and rates confidence, and the agent reads the *thinking* text
  to locate misconceptions, not just wrong answers;
- what is learned accumulates as **propositions and reasoning chains** in a persistent knowledge
  graph that survives across sessions;
- teaching is a planned dependency path toward a goal, not a linear document.

| | |
|---|---|
| Stack | Next.js 16 (App Router) · React 19 · Electron 44 · TypeScript |
| Styling | Tailwind CSS 4 · Radix UI · shadcn-style `components/ui/` |
| Graph rendering | `@xyflow/react` · d3-force · d3-zoom · dagre |
| Content | streamdown (Markdown) · mermaid · katex · remark-math |
| Agent runtime | `@earendil-works/pi-agent-core` / `pi-ai` · MCP SDK · Claude Code CLI bridge |
| License | AGPL-3.0-only |

### Where the code lives

```
src/       197 files   agent runtime, core library, server, persistence
components/123 files   React UI (the largest layer)
app/        41 files   Next.js routes and API handlers
electron/   12 files   desktop shell (window, native picker, auth)
scripts/    18 files   build/verify/import tooling
skills/      5 files   the harness packaged as an installable agent skill
```

---

## 2. Architecture layers

### 2.1 Core Library & Services — 129 nodes

The foundation everything else stands on. `src/core` holds shared contracts, pure utilities,
and the graph engine. It has **no dependency on React or on the app router** — you can import
it from a script, a test, or the packaged skill.

- `src/core/contracts/` — the shared type vocabulary (`chat`, `graph`, `probe`, `plan`,
  `jobs`, `models`, `subscriptions`, `claude-code`). When you add a concept that crosses the
  agent/UI boundary, it belongs here first.
- `src/core/index.ts` — the barrel. It exports **explicitly**, not with `export *`, so the
  public surface stays reviewable.
- `src/core/graph.ts`, `chains.ts`, `clusters.ts`, `coverage.ts` — the knowledge-graph engine.
- `src/core/file-access.ts`, `file-paths.ts`, `auth-keys.ts` — the security-relevant core.

### 2.2 Agent & Learning Harness — 77 nodes

The teaching brain. `src/agent` builds the three agents, composes their prompts, defines their
tools, and runs long work outside the chat turn.

- `src/agent/teacher-agent.ts` — constructs the **teacher, prober, and practice** agents.
- `src/agent/prompts/` — the pedagogy itself, as composable Markdown segments.
- `src/agent/tools.ts` + `src/agent/tools/` — one file per tool capability.
- `src/agent/subagents/` — background work (extraction, research, PDFs, visuals, demos).
- `src/agent/claude-code/` — an alternative engine: drive an installed Claude Code CLI.

### 2.3 User Interface & Application — 177 nodes

Next.js pages (`app/`), React components (`components/`), and the Electron shell (`electron/`).
This layer has the highest fan-out in the graph — `components/chat.tsx` alone touches a large
share of the UI.

### 2.4 Documentation — 44 nodes

`docs/` (user guides, architecture, release process) plus `docs/archive/` for historical design
records. **`docs/archive/` is history, not specification.**

### 2.5 Infrastructure & Configuration — 12 nodes

CI workflows, `electron-builder.yml`, `package.json`, `tsconfig.json`, and the shadcn
`components.json`.

---

## 3. Key concepts

### 3.1 Three agent roles, one codebase

`src/agent/teacher-agent.ts` builds three agents with different jobs, tools, and prompts:

- **Teacher** — measures, plans, and teaches toward a goal.
- **Prober** — diagnoses *where* understanding ends.
- **Practice** — poses problems where the right knowledge must surface unnamed.

They share `src/core/contracts/` and the tool surface, but not their instructions.

### 3.2 The pedagogy lives in Markdown, not in TypeScript

`src/agent/prompts/` is the single most important directory to read:

```
shared/    10-voice 15-accuracy 16-mental-model 20-question-tools
           25-confidence 30-learner-files 40-formatting
teacher/   05-method 10-planning 20-teaching 28-predictions
           30-question-principles 40-jobs 50-demos 55-images
prober/    10-probe-doctrine
practice/  00-base 10-doctrine
```

`src/agent/prompt-segments.ts` composes them. **Changing how the app teaches means editing
these files — not rewriting agent code.** Read `src/agent/prompts/README.md` first.

### 3.3 The knowledge graph is the memory

Teaching accumulates as propositions (individual claims) and chains (the premises that lead
to them), each linked back to the session that produced it. `src/core/graph.ts` answers
topology queries; `src/store/graph.ts` persists it.

### 3.4 Persistence is file-backed and atomic

`src/store/` writes to disk. `src/store/atomic-write.ts` exists because a half-written graph
is worse than no graph. **Never write store files directly** — go through the atomic helpers.

### 3.5 Long work happens outside the chat turn

`src/agent/subagents/runner.ts` coordinates jobs; `bg-llm-semaphore.ts` bounds concurrent
LLM work. PDF conversion, extraction, research, and visual generation all run here, not inside
the user's turn.

### 3.6 Two front doors, one app

`app/` serves the Next.js app. `electron/main.cjs` wraps it in a desktop shell and adds native
capabilities the browser cannot have — notably the folder picker
(`window.lh.getPathForFile`). **A path feature that only works on the desktop must degrade
gracefully in the browser**; `BROWSER_NOTICE` in `components/file-path-drop-zone.tsx` is the
established pattern.

### 3.7 The harness ships as a skill

`skills/learnharness/` packages the whole thing as an installable agent skill with read-only
Python readers over the local learning records. It is also a reference implementation of the
data format — see `skills/learnharness/references/data-format.md`.

---

## 4. Guided tour

1. **Project Overview** — `README.md`, `docs/README.md`
2. **Architecture and Teaching Model** — `docs/architecture.md`, `docs/teaching-methodology.md`
3. **Application Entry Points** — `app/page.tsx`, `app/layout.tsx`, `electron/main.cjs`
4. **Core Contracts and Public Surface** — `src/core/index.ts`, `src/core/contracts/`
5. **The Three Agent Roles** — `src/agent/teacher-agent.ts`, `src/agent/prompts/`
6. **Teaching Method as Prompt Segments** — `src/agent/prompts/teacher/`, `prober/`, `practice/`
7. **The Agent Tool Surface** — `src/agent/tools.ts`, `src/agent/tools/`
8. **Knowledge Graph Engine** — `src/core/graph.ts`, `chains.ts`, `clusters.ts`, `coverage.ts`
9. **Server Orchestration and Streaming** — `src/server/index.ts`, `chat-handler.ts`,
   `events-stream.ts`
10. **Persistence and Atomic Writes** — `src/store/`
11. **Background Subagents** — `src/agent/subagents/`
12. **Model Providers and the Claude Code Bridge** — `src/agent/models.ts`,
    `src/server/model-catalog.ts`, `src/agent/claude-code/`
13. **Session UI and Graph Visualization** — `app/chat/[id]/page.tsx`, `components/chat.tsx`,
    `components/graph-view.tsx`
14. **CLI Skill and Data Format** — `skills/learnharness/`
15. **Build, CI, Release, and Ingestion** — `.github/workflows/ci.yml`,
    `electron-builder.yml`, `scripts/import-notes.ts`

---

## 5. File map

### Core library — `src/core/`

| Area | Files | What they do |
|---|---|---|
| Contracts | `contracts/*.ts` (9) | Shared types across agent, server, and UI |
| Graph engine | `graph.ts` `chains.ts` `clusters.ts` `coverage.ts` `proposition-candidates.ts` `graph-deletion.ts` `session-clusters.ts` | Topology queries, reasoning chains, clustering |
| Session data | `session-markdown.ts` `session-find.ts` `session-navigation.ts` `phases.ts` | Rendering and navigating a conversation |
| Settings | `settings.ts` `settings-resolution.ts` `render-settings.ts` | Parse, validate, resolve settings |
| Security | `file-access.ts` `auth-env.ts` `auth-keys.ts` `custom-provider-auth.ts` | File-access policy, credential handling |
| Paths & text | `file-paths.ts` `content-reader.ts` `math-delims.ts` `native-messages.ts` | Path parsing/quoting, content reading, math delimiters |
| Input | `input-events.ts` `keyboard.ts` `dictation.ts` `ports.ts` `native-messages.ts` | Events, shortcuts, dictation, platform ports |
| Utilities | `search.ts` `fuzzy.ts` `layout.ts` `prices.ts` `cost-summary.ts` `context-usage.ts` `compaction.ts` | Search, layout, cost/usage, compaction |

### Agent runtime — `src/agent/`

| Area | Files | What they do |
|---|---|---|
| Agent construction | `teacher-agent.ts` `tool-execute.ts` `tools.ts` | Build the three agents, run their tools |
| Prompt composition | `prompt-segments.ts` `system-prompt.md` | Assemble the instruction set |
| Providers | `models.ts` `chatgpt-*` `subscription-*` `provider-events.ts` | Model engines and provider bridges |
| Tool implementations | `tools/` (19 files) | One file per capability: `read` `write` `grep` `find` `ls` `web` `pdf-read` `graph` `plan` `probe` `practice` `jobs` `learner-image` … |
| Background work | `subagents/` (14 files) | Extraction, research, PDF, visual, demo builders |
| Claude Code bridge | `claude-code/` (12 files) | Launch and stream an installed Claude Code CLI |

### Server — `src/server/`

| Area | Files | What they do |
|---|---|---|
| Chat turn | `chat-handler.ts` `turn-service.ts` `turn-runs.ts` `turn-liveness.ts` `commit-positions.ts` | One request → one agent turn |
| Streaming | `events-stream.ts` `observability.ts` | SSE fan-out, tracing |
| HTTP surface | `custom-provider*.ts` `web-subscription*.ts` `keys.ts` `model-catalog.ts` `pricing.ts` `search.ts` | Provider and catalog endpoints |
| Data | `graph.ts` `chats.ts` `jobs.ts` `stores.ts` `compaction.ts` | Server-side access to the stores |

### Persistence — `src/store/`

`atomic-write.ts` · `graph.ts` · `graph-format.ts` · `chats.ts` · `jobs.ts` · `settings.ts` ·
`prompt-overrides.ts` · `render-settings.ts` · `source-organization.ts` · `auth.ts`

### API routes — `app/api/`

`chats/` (9) · `graph/` (9) · `settings/` (4) · `activity/` (2) · `subscriptions/` (2) ·
`chat/` · `claude-code/` · `custom-provider/` · `events/` · `jobs/` · `keys/` (2) · `models/` ·
`search/` · `stt/`

---

## 6. Complexity hotspots

89 file-level nodes are marked `complex`. These are the places to read carefully, review
thoroughly, and ask before changing.

### Highest-risk (cross-cutting, auth, or engine internals)

| File | Why it matters |
|---|---|
| `electron/main.cjs` | Desktop lifecycle, window creation, local server lifecycle |
| `electron/chatgpt.cjs` | OAuth credential storage, session state validation |
| `electron/subscriptions.cjs` | Native subscription providers, OAuth flows, model leasing |
| `src/core/settings.ts` | Parsing/validation/sanitization across every setting surface |
| `src/core/settings-resolution.ts` | Resolves settings → model specs, conversation specs, toggles |
| `src/server/settings-body.ts` | Validates incoming settings payloads |
| `src/agent/teacher-agent.ts` | The three agents and their instruction composition |
| `src/agent/tools.ts` | Every tool definition and schema |
| `src/agent/claude-code/stream.ts` | Live process execution, turn output, environment |
| `src/core/keyboard.ts` | Shortcut definitions, localStorage overrides, event normalization |

### UI hubs (highest fan-out)

`components/chat.tsx` · `components/home.tsx` · `components/new-session.tsx` ·
`components/sidebar.tsx` · `components/session-core.ts` ·
`components/settings/agent-section.tsx` · `components/settings/controls.tsx` ·
`components/extraction-coverage.tsx`

### Operational

`.github/workflows/release.yml` (packaging, signing, release validation) ·
`scripts/smoke-image-runtime.mjs` · `scripts/smoke-demo-runtime.mjs`

---

## 7. Practical guidance

- **Read the prompts before the agent code.** `src/agent/prompts/README.md` explains the
  composition model.
- **Add shared types to `src/core/contracts/`, not to a component.**
- **Never write store files directly** — use `src/store/atomic-write.ts`.
- **The graph is the product.** A change that loses propositions or chains loses the
  user's accumulated understanding.
- **Browser and desktop differ.** Anything touching native paths must have a browser
  fallback.
- **Read `docs/architecture.md` for runtime flows** and `docs/development.md` for the local
  workflow before your first change.

---

*Source: Understand-Anything knowledge graph for LearnHarness v0.5.0, commit `713377f`.
Regenerate with `/understand`.*
