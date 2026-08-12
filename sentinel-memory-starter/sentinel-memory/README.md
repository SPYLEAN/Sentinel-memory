# SENTINEL MEMORY

**The operations agent that remembers what worked.**

SENTINEL is a memory-native physical operations agent for venues, campuses, stadiums and event spaces. It recalls similar incidents, compares past response outcomes, simulates current strategies, and retains the resulting operational experience using Hindsight.

## Core loop

`incident → understand → recall → compare → simulate → recommend → observe → retain`

## Why Hindsight is central

- `recall` retrieves relevant prior incidents and response outcomes before a strategy is selected.
- `retain` stores each resolved incident as operational experience.
- `reflect` powers evidence-grounded questions such as “What worked last time?”
- The demo visibly changes after memories are added: recommendations can become memory-informed and confidence changes.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

Without a Hindsight key the project runs in **fallback demo-memory mode** so UI and flow can be developed. For the actual hackathon demo, configure real Hindsight Cloud:

```env
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=your_key_here
HINDSIGHT_BANK_ID=sentinel-ops-v1
```

Then restart the dev server. The header should show `HINDSIGHT CONNECTED`.

## Judge demo

1. Start with an empty/new memory bank and analyze a post-event Gate A surge.
2. Show zero/weak recall and a first-principles recommendation.
3. Resolve it and retain the outcome.
4. Trigger a similar post-event surge at another gate.
5. Show Hindsight recalling the first incident and SENTINEL marking distributed routing as `MEMORY-INFORMED`.
6. Ask: “What worked during similar crowd surges?” and show an evidence-grounded answer.

## Next build priorities

1. Replace deterministic incident parser with structured LLM/function-calling extraction.
2. Replace risk deltas with the Crowd Flow simulation engine.
3. Add real animated digital-twin agents and route graphs.
4. Add Hindsight memory trace/evidence drawer.
5. Add venue profiles and environment memory.
6. Add judge-mode scenario reset/seed controls.
7. Add tests and deploy frontend/API.
