# Consensus Plan: Agora "Agent Derby" — v1

**Status:** `pending approval`
**Source spec:** `.omc/specs/deep-interview-agora-web.md` (deep-interview, ambiguity 17%, PASSED)
**Consensus:** Planner → Architect → Critic, 2 iterations, **APPROVED** (0 critical / 0 major remaining)
**Mode:** RALPLAN-DR short
**Reference design asset:** `/Users/minsungpark/Downloads/agent_trading_marketplace_report.html` → copy into repo as `design/reference-report.html`

---

## RALPLAN-DR Summary

### Principles
1. **Design is the product.** "Wow, I want to put money in" + trust is the primary metric. Every technical choice is subordinate to a premium dark aesthetic and smooth animation.
2. **Swappability over realism.** A real engine replaces the data layer behind a stable `AgentDataSource` interface with zero UI changes. The contract outranks the v1 data behind it.
3. **Standardized benchmark, never raw ROI.** Identical initial capital ($10k default, configurable), identical fee/slippage, identical start date. Ranking is risk-adjusted/normalized (spec line 47).
4. **Public, instant, zero-friction.** Anyone with a link, no auth/wallet, Vercel deploy, fast first paint, mobile-respectable.
5. **Season-native model.** Monthly cohorts first-class; current season live/mutable, past seasons frozen; adding a season requires no schema change.

### Decision Drivers
1. Animation/render performance with multiple live-updating curves (desktop **and** mobile).
2. `AgentDataSource` abstraction quality — clean drop-in for the future real engine.
3. MINT ingest reliability — degrade gracefully (STALE badge).

### Decision A — Charting / Animation Boundary
**lightweight-charts for all financial time series; Framer Motion + Canvas/SVG for everything bespoke (race-track, leaderboard reorder, card flourishes). visx CUT. Recharts rejected (SVG live-update jank + generic look fails driver #1 and the design principle).**

### Decision B — Data Layer & Transport
**`AgentDataSource` interface, 2 implementations:** `MockDataSource` (4 sims computed-on-read, no DB, memoized per (seasonId, dayIndex)) + `KvDataSource` (Vercel KV / Upstash Redis, persists ONLY the MINT real curve). **Polling is the PRIMARY transport** (5–15s, configurable); `subscribe()` body = polling loop. "now" is **server-derived**; D-n granularity is **DAILY** from `season.startDate`. Postgres/Supabase deferred to the first concurrent-writer / relational-join / multi-season-history trigger.

---

## Requirements Summary
- Public Vercel web app — premium racing leaderboard, anyone with the link, no auth.
- 5 seed agents on $10k paper capital (global default $10k, per-portfolio override in contract, no ad-hoc UI rescaler).
  - 1 REAL = MINT bot (live data from Mac mini via ingest endpoint).
  - 4 SIMULATED, distinct strategy types: Polymarket, Weather-arb, Stocks, Crypto — differentiated vol/drawdown/Sharpe profiles.
- D-n DAILY timeline from season start; equity curves; live ranking via **normalized metric (not raw ROI)**.
- Monthly SEASON batches; current = live/mutable, past = frozen snapshot.
- Premium dark aesthetic (#8b5cf6 / #06b6d4, glassmorphism), animations meeting an explicit FPS gate on desktop **and** mobile.
- `AgentDataSource` abstraction (Mock + KV) so a real engine swaps in with no UI changes.
- Follow button = UI-demo no-op / local state only, no persistence.
- **Out of scope (roadmap only):** real-money deposits, wallet, on-chain vaults, builder SDK, x402, ERC-8004, real CEX/DEX execution, user auth.

---

## Acceptance Criteria
| # | Criterion | Test |
|---|-----------|------|
| AC1 | Public URL loads racing leaderboard for any unauthenticated visitor | Incognito open → dashboard renders, no login wall |
| AC2 | 5 seed agents on $10k base with equity curves + ranking | 5 agents; each has curve + rank |
| AC3 | MINT real data reflected in exactly 1 agent | POST valid payload to `/api/ingest/mint` → real agent curve updates; `is_real` true; persisted in KV |
| AC4 | 4 sims distinct strategy types with **distinguishable profiles** | Each sim shows distinct `strategyType` badge; measured vol/maxDD/Sharpe land in per-type target bands |
| AC5 | D-n DAILY timeline; curves advance with elapsed days | X-axis = day index from `season.startDate`; "now" server-derived; advancing date extends curves |
| AC6 | Initial capital configurable; $10k default; per-portfolio override | Default = $10,000; override re-baselines only that portfolio; no UI rescale control |
| AC7 | Season in model + UI; current live, past frozen | `Season` entity; SeasonSelector lists current+past; past immutable; adding a season needs no schema change |
| AC8 | Animations smooth + premium first impression, **desktop and mobile** | (a) sustained **≥55–60 FPS** on race-track + leaderboard via DevTools Performance / rAF on mid-tier laptop AND mobile profile pinned at **Chrome DevTools 4× CPU throttle**; (b) **no long task >50ms** during entry animation, **no layout thrash** (transform/opacity only); (c) **visual-verdict** screenshot vs `design/reference-report.html`: palette #8b5cf6 / #06b6d4, glassmorphism (graded against spec requirement, not literal presence in reference), dark premium tone, explicit pass/fail rubric. All three must pass. |
| AC9 | Data schema abstracted/swappable | Swap `MockDataSource` ↔ `KvDataSource` via `DATA_SOURCE` env with zero component edits |
| AC10 | Leaderboard ranks on a **normalized metric; no raw-ROI-alone** (spec line 47) | Metric ∈ {sharpe, roiPct, maxDrawdown}; default = **Sharpe if computable from sim data, else normalized ROI% + maxDrawdown tiebreak**; never raw absolute PnL as sole sort; equal initialCapital + fee/slippage across all portfolios |

---

## Implementation Steps

### Step 0 — Scaffold + design system + reference asset
- `package.json` — Next.js (App Router) + TS + Tailwind + Framer Motion + lightweight-charts + `@vercel/kv` + zod. (No visx/Supabase/Recharts.)
- `tailwind.config.ts` — tokens: #8b5cf6, #06b6d4, gradient stops, glass blur scale, dark surfaces.
- `app/globals.css` — dark base, glassmorphism utilities, gradient text. `app/layout.tsx` — fonts, dark body, gradient mesh.
- **Copy** `/Users/minsungpark/Downloads/agent_trading_marketplace_report.html` → `design/reference-report.html`.

### Step 1 — Domain types, `AgentDataSource` interface, KV conventions, Postgres mapping
- `lib/types/domain.ts`: `StrategyType='polymarket'|'weather-arb'|'stocks'|'crypto'|'mint'`; `Agent{id,name,strategyType,isReal,seasonId,ownerLabel?}`; `Season{id,label,month,startDate,status:'live'|'frozen',agentIds[]}`; `EquityPoint{dayIndex,ts /*ISO8601 UTC*/,equity,pnl,roiPct}`; `PaperPortfolio{agentId,seasonId,initialCapital,feeBps,slippageBps,equityCurve}`; `Trade{agentId,ts,side,size,price,pnl}`; `LeaderboardMetric='sharpe'|'roiPct'|'maxDrawdown'`; `LeaderboardEntry{agentId,rank,pnl,roiPct,sharpe,maxDrawdown}`; `Leaderboard{seasonId,metric,entries[]}`.
- `lib/config/capital.ts` — `DEFAULT_INITIAL_CAPITAL=10_000`, per-portfolio override, no UI rescaler.
- `lib/data/AgentDataSource.ts` — `getSeasons()`, `getCurrentSeason()`, `getAgents(seasonId)`, `getPortfolio(agentId, seasonId)`, `getLeaderboard(seasonId, metric)`, `subscribe(cb)` (v1 = polling loop).
- `lib/data/kvKeys.ts` — `season:{id}`, `agent:{id}`, `portfolio:{agentId}:{seasonId}`, `mint:latest`, `mint:curve:{seasonId}` (append-only list).
- `lib/data/index.ts` — factory by env `DATA_SOURCE=mock|kv`.
- **Postgres migration mapping docstring:** `season:{id}`→`seasons(id PK)`; `agent:{id}`→`agents(id PK, season_id FK)`; `portfolio:{agentId}:{seasonId}`→`portfolios(agent_id, season_id composite PK, initial_capital, fee_bps, slippage_bps)`; `mint:curve:*`→`equity_points(agent_id, season_id, day_index, ts, equity, pnl, roi_pct)`. Swap = KV reads become SQL selects behind the same interface.

### Step 2 — Seed simulator + MockDataSource (differentiated sims)
- `lib/data/sim/StrategySimulator.ts` — deterministic from `(seed, strategyType, startDate, now)`, computed on read, honors `initialCapital/feeBps/slippageBps`. **Memoize per (seasonId, dayIndex)** to avoid recompute across N concurrent viewer polls. Per-type bands:

  | Strategy | Profile | Target ann. vol | Target max DD | Target Sharpe |
  |----------|---------|-----------------|---------------|---------------|
  | Crypto | high vol / high drift variance | ~60–90% | 20–40% | wide, can be negative |
  | Stocks | moderate vol / trend + drawdowns | ~15–25% | 8–15% | ~0.5–1.5 |
  | Polymarket | bimodal jumps (binary resolutions) | jumpy/event-driven | spiky | jump-dominated |
  | Weather-arb | low vol / steady small edge / occasional step | ~5–10% | <8% | high & stable |

- `lib/data/metrics.ts` — `computeSharpe`, `computeMaxDrawdown`, `computeRoiPct`. **Rank = Sharpe if computable (it is), else normalized ROI% + maxDD tiebreak; never raw absolute PnL alone.**
- `lib/data/seed/seasons.ts` — Season 1 cohort: 5 agents (1 MINT `isReal`, 4 sims), startDate, names, types.
- `lib/data/MockDataSource.ts` — implements `AgentDataSource`; leaderboard via `metrics.ts`.

### Step 3 — MINT ingest endpoint + KvDataSource
- `lib/data/mint/mintPayload.ts` — zod: `{ schemaVersion, agentId, seasonId, ts /*ISO8601 UTC*/, equity, pnl, cashBalance?, trades?[] }`. **Bot sends raw (ts, equity, pnl) only — server computes `dayIndex`** from server "now" − `season.startDate`. **Idempotency:** overwrite the point for matching `dayIndex` when incoming `ts` is newer; **today's point is provisional/mutable** until dayIndex rolls; `EquityPoint.ts` = producing update's ts. Auth header **`X-Mint-Secret`**.
- `app/api/ingest/mint/route.ts` — `POST`: validate secret → 401 on mismatch; validate payload; compute server-side dayIndex; upsert `mint:latest` + overwrite-newest `mint:curve:{seasonId}`; set `lastSeenAt`.
- `lib/data/KvDataSource.ts` — MINT curve from KV; 4 sims delegated to memoized simulator. **Staleness:** `staleAfterSeconds`, `lastSeenAt` (compared against **server clock**); offline → last-known equity + **STALE** flag. `mint:latest.equity` drives a live "current equity" readout so UI feels live while the plotted curve steps daily.
- `lib/data/mint/README.md` — Mac mini bot integration: endpoint URL, `X-Mint-Secret`, payload schema, raw-fields-only contract, staleness, example curl.

### Step 4 — Core UI components
- `components/RaceTrack.tsx` — horse-race metaphor; runners by normalized rank; Framer Motion **transform/opacity only**, `will-change`, no layout thrash. **Mobile:** responsive (h-scroll / v-stack / simplified variant); must hit FPS gate on mobile profile.
- `components/Leaderboard.tsx` — ranked list, **metric selector** (sharpe/roiPct/maxDrawdown — NOT raw PnL as sole sort); `AnimatePresence` reorder.
- `components/AgentCard.tsx` — glass card: name, strategy badge, `is_real` **LIVE** / **STALE** badge, current equity/ROI, sparkline, **Follow = local-state no-op**.
- `components/EquityCurveChart.tsx` — lightweight-charts wrapper; live `update()` on poll; dark theme from tokens.
- `components/SeasonSelector.tsx` — current (live) + past (frozen). `components/SeasonTimeline.tsx` — D-n DAILY axis.
- `components/EmptyStates.tsx` — Day-0: sims render immediately; MINT agent shows **"awaiting first data" / baseline** before first post.

### Step 5 — Page composition, polling transport, deploy
- `app/page.tsx` — composes race track + leaderboard + season + equity panel; SSR initial data; client polling subscription.
- `lib/hooks/useLiveLeaderboard.ts` — polling loop (5–15s, configurable) implementing `subscribe()`; server-derived "now"; optional SSE upgrade.
- `app/api/state/route.ts` (optional) — SSE/poll endpoint returning current snapshot.
- env: `DATA_SOURCE`, `MINT_INGEST_SECRET`, `KV_*`, `POLL_INTERVAL_MS`, `STALE_AFTER_SECONDS`. `README.md` — deploy + Mac mini pointer.

---

## Risks and Mitigations
| Risk | Severity | Mitigation |
|------|----------|------------|
| Animation jank, esp. mobile (driver #1) | High | lightweight-charts (Canvas) for curves; Framer transform/opacity only; rAF-batched poll updates; AC8 FPS gate on desktop **and** mobile (4× throttle) before sign-off |
| MINT plumbing from Mac mini (driver #3) | High | Server-side ingest (not browser→Mac); `X-Mint-Secret`; persist to KV (web independent of Mac uptime); STALE badge + last-known equity on offline; server owns dayIndex + staleness clock |
| Sims indistinguishable | Medium | M3 per-type vol/DD/Sharpe bands; AC4 measures band membership; realistic drawdowns, never monotonic |
| Design quality bar | High | Route Step 4 through `designer`; mandatory `/visual-verdict` vs `design/reference-report.html` before AC8 sign-off |
| Leaky abstraction | Medium | Interface before UI; 2 impls (Mock + KV); components import only the factory; Postgres mapping documented |
| Dropped benchmark constraint (raw ROI) | High | AC10 + metrics.ts: normalized ranking; equal initialCapital + fee/slippage; no raw-ROI-alone sort |
| Intraday-vs-daily curve expectation mismatch | Medium | Conscious v1 choice: "live" = polling-refreshed `mint:latest` readout + today's provisional point; plotted curve steps daily. Surface to stakeholder; revisit if intraday line wanted |
| Scope creep into roadmap | Medium | Follow = local no-op; no wallet/auth/vault/x402; reviewer rejects roadmap code |

---

## Verification Steps
1. **Contract/swap:** both impls satisfy `AgentDataSource`; swap via `DATA_SOURCE` with zero component diffs (AC9); Postgres mapping docstring present.
2. **Functional (incognito):** 5 agents, 4 distinct curves, ranking, D-n daily axis, season selector current+past (AC1,2,5,7).
3. **Sim differentiation:** compute vol/maxDD/Sharpe per sim → in M3 bands (AC4).
4. **MINT ingest:** POST valid payload w/ `X-Mint-Secret` → real agent updates + KV persists; bad/absent secret → 401; same-day re-post overwrites (server dayIndex); simulate offline → STALE + last-known (AC3).
5. **Normalized metric:** default rank = Sharpe (or normalized ROI%+maxDD); switch metric → re-rank; equal initialCapital + fee/slippage; no raw-PnL-only sort (AC10).
6. **Capital config:** default $10,000; per-portfolio override re-baselines only that portfolio; no UI rescaler (AC6).
7. **Performance (AC8a/b):** DevTools + rAF on mid-tier laptop AND mobile (4× CPU throttle) → sustained ≥55–60 FPS, no long task >50ms during entry, no layout thrash.
8. **Visual verdict (AC8c):** `/oh-my-claudecode:visual-verdict` deployed page vs `design/reference-report.html` → palette + glassmorphism + dark premium → explicit pass/fail.
9. **Empty/Day-0:** first load → sims render, MINT shows "awaiting first data"/baseline.
10. **Roadmap-exclusion:** no wallet/auth/vault/payment code; Follow is local no-op.

---

## ADR — Architecture Decision Record

**Decision:** Build Agora "Agent Derby" v1 as a Next.js (App Router) + TypeScript design-forward public dashboard, with an `AgentDataSource` abstraction (MockDataSource computed-on-read + KvDataSource persisting only the MINT real curve), polling as the primary transport, lightweight-charts for equity curves, and Framer Motion/Canvas for bespoke animation. Ranking is normalized (Sharpe / ROI% / maxDrawdown), never raw ROI.

**Drivers:** (1) design/animation is the spec's #1 hard constraint; (2) data layer must be swappable to a real engine; (3) MINT ingest must degrade gracefully; (4) standardized fair benchmark (spec line 47).

**Alternatives considered:**
- *Supabase Postgres + Realtime* — REJECTED for v1: over-provisioned for one slow-cadence MINT writer + deterministic sims; WebSocket lifecycle spends effort against design-velocity; polling suffices. Deferred to first concurrent-writer/relational trigger (mechanical swap via the interface).
- *visx for charts* — REJECTED: SVG perf degrades with live multi-series on mobile; redundant once lightweight-charts owns curves and Framer owns bespoke motion.
- *Recharts* — REJECTED: SVG live-update jank + generic look conflicts with the premium/trust goal.
- *Browser→Mac-mini direct poll* — REJECTED: reliability/security/CORS; Mac mini not publicly addressable.
- *Persist sim curves to DB* — REJECTED: storing derivable data; compute-on-read (memoized) is fresher and migration-free.

**Why chosen:** Lowest-regret path that protects design velocity while keeping the real-engine swap cheap by construction (the interface proves swappability; a second toy impl proves it; production infra adds cost, not proof). Satisfies all acceptance criteria with ~half the infra surface.

**Consequences:** v1 "live" = polling-refreshed latest equity + today's provisional point; the plotted equity curve steps daily (conscious trade-off, surfaced to stakeholder). KV is non-relational — fine for a single MINT writer; relational needs trigger the documented Postgres migration. Mobile is a first-class FPS gate, not an afterthought.

**Follow-ups (roadmap, NOT v1):** on-chain non-custodial vault + wallet connect + deposit/withdraw; builder submission SDK; x402 payments; ERC-8004 reputation; real paper-trading engine replacing MockDataSource; Postgres migration when concurrency/relational/multi-season-history is needed; intraday curve resolution if stakeholders want a sub-daily line.

---

## Changelog (consensus improvements applied)
**Iteration 1 (Architect synthesis + Critic REJECT) → Iteration 2:**
- Decision B replaced: Supabase Realtime → Vercel KV (MINT-only) + Mock computed-on-read; polling promoted to primary transport.
- visx cut from the stack.
- **C1:** restored normalized-benchmark / no-raw-ROI constraint → AC10 + `metrics.ts` + Leaderboard metric selector (3-place enforcement).
- **C2:** AC8 rewritten measurable (≥55–60 FPS desktop+mobile @ 4× throttle, no long task >50ms, visual-verdict rubric vs in-repo reference).
- **M1:** canonical TS domain types + KV key conventions + Postgres migration mapping docstring.
- **M2:** MINT payload zod schema + auth + idempotency + staleness + bot README.
- **M3:** per-strategy differentiation bands (vol/maxDD/Sharpe) → AC4 checkable.
- **M4:** mobile race-track responsive strategy folded into the FPS gate.
- ALSO: season lifecycle (live/frozen), Follow no-op, Day-0 empty states, daily D-n + server "now", capital default+override no-rescale.

**Iteration 2 (Architect SOUND + 3 clarifications, Critic APPROVE):**
- MINT idempotency pinned: **server computes dayIndex** (bot sends raw ts/equity/pnl); today's point provisional/mutable; `mint:latest.equity` drives live readout; staleness compared against server clock.
- MockDataSource curve **memoized per (seasonId, dayIndex)**.
- AC8 mobile profile pinned to **Chrome DevTools 4× CPU throttle** for reproducibility.
