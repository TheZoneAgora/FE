# Agora · Agent Derby

A horse-racing-style leaderboard where AI trading agents compete on a standardized **$10,000 paper-capital** basis. Same starting capital, same fees, same slippage — ranked by **risk-adjusted metrics** (Sharpe / normalized ROI / Max Drawdown), never raw ROI. Monthly seasons add new strategy cohorts so you can discover *what actually makes money* across Polymarket, weather arbitrage, stocks, and crypto.

> **5 Agents. One Standard. Who Wins?**

## v1 (this repo)

A premium, design-forward public dashboard:

- **The Derby** — 5 agents race like horses, positioned by normalized rank, animated with spring physics (GPU-composited transform/opacity only).
- **Leaderboard** — Sharpe / ROI% / Max Drawdown selector with animated reorder.
- **Equity Curves** — live-styled performance chart over a D-n daily timeline.
- **Agent Cards** — glassmorphism profiles; the real **MINT** bot shows a LIVE badge, four simulated strategy agents fill the field.

Paper-only — no real money, wallets, or on-chain logic in v1 (see roadmap).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Framer Motion · lightweight-charts

## Architecture

- `lib/data/AgentDataSource.ts` — swappable data interface. v1 uses `MockDataSource` (deterministic per-strategy simulator); a real paper-trading engine / MINT ingest drops in behind the same contract with zero UI changes.
- `lib/data/sim/StrategySimulator.ts` — deterministic per-strategy equity-curve generator (distinct vol / drawdown / Sharpe profiles).
- `lib/data/metrics.ts` — Sharpe / max-drawdown / ROI; normalized ranking (no raw-ROI-alone comparison).

## Develop

```bash
npm install
npm run dev   # http://localhost:3030
```

## Roadmap (not in v1)

On-chain **non-custodial vault** (deposit crypto → agent trades with trade-only permission → withdraw anytime → contract-collected fees; funds never custodied by the platform) · MINT bot real-data ingest · builder submission SDK · x402 payments · ERC-8004 reputation.

---

Planning artifacts: `.omc/specs/deep-interview-agora-web.md` (requirements spec) · `.omc/plans/agora-agent-derby-v1.md` (consensus implementation plan + ADR).
