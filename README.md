# Gadidex

Web-first car-spotting collectible app. Scan a photo â†’ collectible card â†’ garage â†’ spot map.

> **Agents / new chats:** start with [`AGENTS.md`](./AGENTS.md) â€” full handoff, architecture, and next tasks.

## Run

```bash
cd gadidex
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Optional vision AI

Create `.env.local`:

```
GEMINI_API_KEY=...
# or
OPENAI_API_KEY=...
```

Without a key, recognition uses the built-in mock catalog.

## Stack

- Next.js 15 App Router + TypeScript
- JSON file store (`data/gadidex.json`) for v1
- MapLibre + OpenFreeMap
- Guest cookie sessions (Google link later)

## Docs

| Doc | Path |
|-----|------|
| Agent handoff | [`AGENTS.md`](./AGENTS.md) |
| Design spec | [`../docs/superpowers/specs/2026-10-24-gadidex-design.md`](../docs/superpowers/specs/2026-10-24-gadidex-design.md) |
| Implementation plan | [`../docs/superpowers/plans/2026-10-24-gadidex-implementation.md`](../docs/superpowers/plans/2026-10-24-gadidex-implementation.md) |
| CarDex RE findings (context only) | [`../artifacts/evidence/FINDINGS.md`](../artifacts/evidence/FINDINGS.md) |
