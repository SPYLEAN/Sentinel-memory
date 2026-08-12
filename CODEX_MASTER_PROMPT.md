# SENTINEL V1 — Codex Execution Prompt

You are the lead engineer for SENTINEL, a memory-native physical operations agent. Work directly in this repository. Do not redesign the product concept. Preserve the core loop:

**incident → understand → Hindsight recall → compare prior outcomes → simulate strategies → recommend → operator resolves → Hindsight retain → future incidents improve**

## Non-negotiable product requirements

1. Hindsight is the real memory layer and must be visible in the UI.
2. Keep a fallback memory provider only for local UI development; judge mode must use real Hindsight.
3. Never expose HINDSIGHT_API_KEY to the browser. All Hindsight calls remain server-side.
4. One workflow only: crowd/physical-operations incident response.
5. The demo must show a clear before/after learning moment.
6. Every recommendation must include evidence/reasoning rather than appearing magical.
7. Maintain a premium command-center visual identity: near-black, restrained mint status accents, red only for risk. No generic SaaS card grid, no cyberpunk neon overload.

## Phase A — Make the scaffold production-clean

- Run the app, fix all TypeScript/build/runtime errors.
- Verify the official `@vectorize-io/hindsight-client` signatures currently installed; adjust the adapter to the installed SDK rather than guessing.
- Add robust error handling for Hindsight 401/402/404/5xx responses.
- Make bank creation safe/idempotent.
- Add `/api/health` with Hindsight connectivity state.
- Ensure `npm run build` passes.

Acceptance: app starts with and without HINDSIGHT_API_KEY and the UI clearly reports the active memory mode.

## Phase B — Hindsight learning loop

Create a typed operational memory schema represented as natural-language memory records:
- incident memory: type, location, context, severity, time
- response memory: chosen intervention and alternatives
- outcome memory: risk before/after, effectiveness, operator note
- environment memory: venue-specific constraints and patterns

Before every recommendation:
- recall similar incidents
- recall successful/failed response patterns
- use the evidence to alter confidence and recommendation ordering

After resolution:
- retain a compact but information-rich experience record
- verify the next related incident can retrieve it

Add a judge-mode reset/seed endpoint. Do not fake Hindsight results in judge mode.

Acceptance: resolving Incident A changes the recommendation/evidence displayed for related Incident B.

## Phase C — Crowd simulation

Replace fixed projected-risk deltas with a deterministic simulation module inspired by a crowd-flow digital twin:
- zones/gates
- occupancy
- inflow/outflow
- route capacity
- congestion score
- risk score
- strategy effects

Keep it fast enough for instant demo feedback. Use deterministic seeded randomness if particles are involved.

Acceptance: each strategy produces explainable projected metrics and materially different route/risk outcomes.

## Phase D — Incident intelligence

Replace the regex-only parser with a structured extraction layer that can use an LLM when configured and deterministic fallback otherwise. Output strict JSON:
- incident_type
- location
- severity
- crowd_direction
- contributing_factors
- confidence

Do not let the LLM directly decide the final intervention. It supplies structured context; memory + simulation drive the recommendation.

## Phase E — UI / judge mode

Build these states exceptionally well:
1. Live Environment / digital twin
2. Incident Command
3. Hindsight Memory Recall
4. Strategy Simulator
5. Operational Memory timeline
6. Ask SENTINEL evidence query

Add a visible animation/state when memory is retained: `MEMORY RETAINED`.
Add a clear `MEMORY-INFORMED` indicator when recalled evidence changes a strategy.
Add “Show evidence” to expose the exact recalled memories that influenced the decision.

## Demo scenario to optimize for

Incident A: post-concert surge at Gate A. Initially no memory. Single-exit diversion only partially helps; distributed Gate B + Gate C routing resolves it. Retain outcome.

Incident B: post-football surge at North Gate. Recall Incident A. Distributed routing should move to the top and be explicitly marked memory-informed with evidence.

Ask SENTINEL: “Why are you recommending distributed routing?” Answer must reference actual recalled memories.

## Engineering rules

- TypeScript strict mode.
- Small modules; no giant App.tsx logic blobs after refactor.
- No secrets client-side.
- No invented benchmark claims.
- No unnecessary frameworks.
- Add tests around memory-to-strategy ranking and simulation risk calculations.
- Commit after each stable phase with clear messages.

Start with Phase A. Inspect the repo first, then implement and run tests/build before moving forward.
