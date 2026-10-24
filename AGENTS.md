# Gadidex - agent handoff

Read this first if you are continuing work on Gadidex in a new chat/agent.

## What this is

**Gadidex** is a web-first car-spotting collectible app (CarDex-inspired behavior, original brand/backend/assets). Users upload a car photo, get a collectible card, save to a garage, and see spots on a map.

- Workspace root: `C:\Personal\rea`
- App root: `C:\Personal\rea\gadidex`
- Related RE evidence: `C:\Personal\rea\artifacts\evidence\` (do **not** call CarDex / Studio Muench APIs or copy their assets)

## Product decisions (locked)

| Topic | Choice |
|--------|--------|
| Platform | Next.js App Router + TypeScript (web first; mobile later) |
| Architecture | Single full-stack Next.js app |
| Recognize | Hybrid: mock catalog by default; Gemini/OpenAI if env key set |
| Auth | Guest cookie now; Google link later |
| Limits / billing | None in v1 |
| Data | JSON file store `data/gadidex.json` (Prisma abandoned - engine install hung) |
| Maps | MapLibre GL + OpenFreeMap style |
| Brand | **Gadidex** only in UI - never ship as CarDex |

## How to run

```bash
cd gadidex
npm install
npm run dev
```

Open http://localhost:3000

Optional `.env.local`:

```
GEMINI_API_KEY=...
# or
OPENAI_API_KEY=...
```

Without a key, `getRecognizer()` uses `MockCatalogRecognizer`.

## Scripts

- `npm run dev` - Next.js Turbopack on port 3000
- `npm run build` / `npm start` - production
- `npm run lint` - ESLint

## Repo layout

```
gadidex/
  AGENTS.md                 <- this handoff
  README.md                 <- short human README
  package.json
  src/
    middleware.ts           <- issues gadidex_guest cookie if missing
    app/
      layout.tsx / page.tsx / globals.css
      scan/page.tsx         <- client upload + recognize
      garage/page.tsx       <- list cards
      garage/[id]/page.tsx <- card detail
      map/page.tsx          <- MapLibre spots
      api/
        auth/guest/route.ts
        recognize/route.ts  <- multipart image -> card
        garage/route.ts
        garage/[id]/route.ts
    components/
      Nav.tsx
      SpotMap.tsx
    lib/
      auth.ts               <- ensureGuestUser / cookie name
      store.ts              <- JSON DB (users, cards, catalog)
      recognizer/
        index.ts            <- getRecognizer()
        mock.ts
        vision.ts           <- Gemini + OpenAI
        types.ts
  public/uploads/           <- saved scan images (gitignored contents)
  data/gadidex.json         <- created at runtime (gitignored)
```

Docs outside the app:

- Spec: `docs/superpowers/specs/2026-10-24-gadidex-design.md`
- Plan: `docs/superpowers/plans/2026-10-24-gadidex-implementation.md`
- CarDex RE notes: `artifacts/evidence/FINDINGS.md`

## Data model (JSON store)

- **User:** `id`, `guestToken`, `googleSub | null`, `createdAt`
- **Card:** make/model/yearLabel/bodyStyle/hp/topSpeed/estimatedValue/rarity/origin/notes/`imagePath`/`lat`/`lng`/`userId`/timestamps
- **CatalogCar:** seed cars + `keywords` for filename-hint mock matching

Store API: `src/lib/store.ts` (`findUserByGuestToken`, `createUser`, `listCards`, `getCard`, `createCard`, `listCatalog`, `listMappedCards`).

## Auth flow

1. `middleware.ts` sets httpOnly cookie `gadidex_guest` (UUID) if absent.
2. `ensureGuestUser()` loads or creates a `User` for that token.
3. `/api/recognize` also creates guest+cookie if somehow missing (`guestOrCreate`).
4. Google linking: field exists (`googleSub`); **not implemented** yet.

## Recognize flow

1. `POST /api/recognize` multipart: `image`, optional `lat`/`lng`
2. Save file under `public/uploads/`
3. `getRecognizer().recognize(...)`
4. Persist card via `store.createCard`
5. Return `{ card, source: "mock" | "gemini" | "openai" }`

## UI / design notes

- Brand fonts: Bebas Neue + DM Sans (see `globals.css`)
- Look: asphalt dark + amber accents (not purple/cream AI defaults)
- Routes: `/`, `/scan`, `/garage`, `/garage/[id]`, `/map`

## Encoding gotcha (Windows)

Some files were briefly saved as UTF-16 LE and broke Turbopack (`Could not parse module middleware.ts`). Source under `src/` must stay **UTF-8**. If parse errors reappear, check for null bytes on odd offsets and reconvert to UTF-8.

## What works today

- [x] Landing, scan, garage, detail, map
- [x] Guest cookie + guest API
- [x] Mock recognize + optional vision keys
- [x] Geolocation attached on scan when browser allows
- [x] Dev server smoke-tested (home/garage/guest 200)

## Not done / good next tasks

1. **Google OAuth link** for guests (`googleSub`)
2. **Prisma/Postgres** migration when DB is needed (replace `store.ts`)
3. **On-device privacy blur / plate detect** (optional; CarDex had ONNX + ML Kit)
4. **Flutter / mobile** client against same APIs
5. **Stripe / limits** (explicitly out of v1)
6. **Hardening:** upload size/type limits, rate limits, auth on all writes
7. **Tests:** API smoke + store unit tests
8. Clean leftover `prisma/` folder if still present (unused)

## Constraints for agents

- Do not call `car-proxy-v2.studiomuench.workers.dev` or reuse CarDex package IDs/assets.
- Do not commit secrets; keep keys in `.env.local`.
- Prefer small focused changes; keep brand name **Gadidex**.
- Only commit when the user asks.