# Deep Interview Spec: Agora — AI 트레이딩 에이전트 경마장 (Agent Derby)

## Metadata
- Interview ID: agora-web-2026-06-21
- Rounds: 6
- Final Ambiguity Score: 17%
- Type: greenfield
- Generated: 2026-06-21
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: yes (참고: agent_trading_marketplace_report.html)
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 0.40 | 0.36 |
| Constraint Clarity | 0.78 | 0.30 | 0.234 |
| Success Criteria | 0.80 | 0.30 | 0.24 |
| **Total Clarity** | | | **0.834** |
| **Ambiguity** | | | **0.166 (17%)** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| 리더보드 / Agent Derby UI | **active (v1 핵심)** | 에이전트 카드, 랭킹, $10k 페이퍼 경주 수익률 그래프, 경마 시각화, follow 버튼 | v1 전체 범위. Acceptance Criteria 전부 커버 |
| 페이퍼 벤치마크 엔진 | active (v1 경량) | $10k 표준 초기자본(조절가능), 실시간 페이퍼 실행, 월간 시즌 배치 | v1 = MINT 실데이터 ingest + 4개 시뮬 곡선. 풀 엔진은 로드맵 |
| 에이전트 등록 (빌더 SDK) | active (로드맵) | 외부 빌더가 봇 endpoint/manifest 제출 | v1 제외. 시즌 2+ 에서 도입 |
| x402 결제 | active (로드맵) | per-call/per-signal, 볼트 take rate | v1 제외. 실자금 볼트 단계에서 도입 |
| ERC-8004 평판 | **deferred** | 온체인 신원/평판 표준 | 사용자 확정 deferral (2026-06-21): MVP 불필요, DB 평판으로 충분, 나중 호환 레이어 |

## Goal
**한 줄:** 트레이딩 에이전트들이 동일한 $10,000 페이퍼 자본으로 경쟁하는 "경마장형" 랭킹 대시보드를 배포해서, 투자자가 직관적으로 "와 이거 돈 넣어보고 싶다"는 신뢰감을 느끼게 만든다.

**v1 (지금 만들 것):**
- 시드 에이전트 5개가 $10k 페이퍼로 경주하는 공개 배포 웹.
- 1개는 실데이터(MINT 봇, 맥미니), 4개는 서로 다른 전략 타입의 시뮬레이션(폴리마켓 예측시장 / 날씨 arbitrage / 주식 / 크립토).
- 시작일 기준 D-n 타임라인, 수익률 곡선 그래프, 실시간 랭킹.
- 월간 시즌 배치: 매달 새 전략들이 추가되어 "무엇이 잘 버나"를 발견.
- 프리미엄 다크 디자인 + 최적화된 애니메이션이 하드 요구사항.

**전체 비전 (로드맵):** 검증된 에이전트는 follow → 유저가 온체인 비수탁 볼트에 실자금 입금 → 에이전트가 거래 권한만으로 라이브 운용 → 유저 자유 출금 → 컨트랙트가 수수료 자동 징수. 우리는 자금을 보관하지 않는 SW/플랫폼 제공자.

## Constraints
- **디자인이 최우선 하드 제약**: 직관적이고, 신뢰를 주고, 최적화된 애니메이션 필수. 참고 톤 = `agent_trading_marketplace_report.html` (다크, purple #8b5cf6 / cyan #06b6d4 그라디언트).
- **v1은 페이퍼 전용**: 실제 자금 이동·온체인·지갑 연결 없음.
- **표준화된 벤치마크**: 모든 에이전트 동일 $10k(조절가능) 초기자본, 동일 수수료/슬리피지 기준 — Raw ROI 비교 금지(리포트 5장).
- **데이터 출처**: 실시간 페이퍼 엔진 지향 + MINT 봇 실거래 데이터(맥미니)를 1개 에이전트로 ingest. 나머지 4개는 그럴듯한 시뮬레이션.
- **월간 시즌 구조**: 시즌마다 새 전략 코호트 추가.
- **데이터 스키마는 실엔진 대비 설계**: v1 시뮬이어도 나중에 실제 페이퍼 엔진/실데이터를 같은 스키마로 갈아끼울 수 있어야 함.
- **수탁 모델 (로드맵 확정)**: 온체인 비수탁 볼트. 우리 지갑에 자금 안 들어옴. 규제 회피+수익(컨트랙트 자동 take rate)+신뢰(온체인 검증가능) 3목표 동시 최적.

## Non-Goals (v1 명시적 제외)
- 실제 자금 입금 / 지갑 연결 / 온체인 볼트 컨트랙트 (로드맵)
- 외부 빌더 제출 SDK/샌드박스 (로드맵)
- x402 결제, ERC-8004 평판 (각각 로드맵 / deferred)
- 실제 거래소(CEX/DEX) 라이브 주문 체결
- 사용자 인증/계정 시스템 (v1은 공개 열람 위주 — follow는 UI 시연 수준)

## Acceptance Criteria
- [ ] 공개 배포 URL이 존재하고, 링크를 받은 누구나 열면 경마장 스타일 랭킹 대시보드가 보인다.
- [ ] 5개 시드 에이전트가 $10k 초기자본 기준으로 경주하며 수익률 곡선/랭킹이 표시된다.
- [ ] MINT 봇의 실거래 데이터가 1개 에이전트로 반영된다 (맥미니 → 웹 데이터 연결).
- [ ] 나머지 4개는 서로 다른 전략 타입(폴리마켓/날씨arb/주식/크립토)으로 구분되어 시뮬레이션된다.
- [ ] 시작일 기준 D-n 타임라인이 보이고 시간 경과에 따라 곡선이 갱신된다.
- [ ] 초기자본 숫자가 조절 가능하도록 설계되어 있다 ($10k는 기본값).
- [ ] 월간 시즌 개념이 데이터 모델/UI에 반영되어 있다.
- [ ] 애니메이션이 최적화되어 끊김 없이 부드럽고, 첫인상에서 "신뢰감 + 돈 넣고 싶은 느낌"을 준다.
- [ ] 데이터 스키마가 추후 실시간 페이퍼 엔진/실데이터로 교체 가능하게 추상화되어 있다.

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 리포트대로 "페이퍼 우선, 무수탁"이 핵심 모델 | 유저가 실자금 볼트 모델을 언급 | 둘 다 — **경주는 페이퍼 벤치마크, follow 후 실자금은 온체인 볼트**로 깔끔히 분리 |
| 자금이 우리 지갑에 들어온다? | 수탁 = 규제 직격 | **아니오. 비수탁 스마트컨트랙트 볼트.** 우리는 알고리즘+플랫폼 제공, take rate만 수취 |
| 온체인 볼트를 v1에 넣어야 | Contrarian: 실자금 0원이어도 제품의 90% 증명됨 | **v1 = 페이퍼 랭킹 대시보드만.** 볼트는 로드맵 |
| 데이터는 mock일 것 | Simplifier: 진짜냐 시뮬이냐 | MINT 봇 실데이터 1개 + 시뮬 4개 하이브리드 |
| ERC-8004 필수 | 꼭 필요? | **Deferred.** DB 평판으로 충분, 나중 호환 레이어 |
| 디자인은 부차적 | — | **디자인이 v1 최우선 하드 제약** (신뢰·전환의 핵심) |

## Technical Context (제안 — 디자인 중심 그린필드)
- **프레임워크**: Next.js (App Router) + TypeScript
- **스타일**: Tailwind CSS + Framer Motion (애니메이션 — 하드 요구사항 충족 핵심)
- **차트**: 수익률 곡선/레이싱 차트용 lightweight-charts 또는 visx/Recharts (성능 최적화 우선)
- **데이터 레이어**: v1은 추상화된 데이터 어댑터(`AgentDataSource` 인터페이스) — 시드 JSON/시뮬레이터 + MINT ingest endpoint. 추후 실엔진으로 교체.
- **MINT 연결**: 맥미니 MINT 봇이 결과를 간단한 API/Supabase/JSON에 push → 웹이 polling/fetch. (구체 방식은 구현 시 확정)
- **배포**: Vercel (즉시 공개 URL, 공유 용이)
- **디자인 톤**: 다크 프리미엄, purple/cyan 그라디언트, 글래스모피즘 카드 (참고 리포트 HTML 계승)

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| Agent | core domain | id, name, strategy_type, owner/builder, is_real, season_id | Builder owns Agent; Agent ranked on Leaderboard; Agent has many Trades |
| Strategy Type | core domain | name (Polymarket/Weather-arb/Stocks/Crypto) | categorizes Agent |
| Season / Batch | core domain | id, month, agents[], start_date | has many Agents |
| Leaderboard | core domain | season_id, metric (PnL/ROI/Sharpe/MDD), ranks | ranks Agents within Season |
| PaperPortfolio | core domain | agent_id, initial_capital ($10k default), equity_curve, D-n timeline | belongs to Agent |
| Trade / Order | supporting | agent_id, ts, side, size, price, pnl | belongs to Agent |
| MINT (data source) | external system | live trading data on Mac mini | feeds the 1 real Agent |
| Market Data | external system | price feeds (crypto/prediction/weather/stocks) | drives PaperPortfolio |
| Trader / Depositor | core domain | (v1: 열람자) watchlist, followed_agents | follows Agents (로드맵: deposits to Vault) |
| Builder | supporting | id, submitted_agents | owns Agents (로드맵) |
| Vault | core domain (로드맵) | contract_addr, agent_id, fee_structure | non-custodial; holds depositor funds on-chain |
| Fee | supporting (로드맵) | platform_take, performance_fee | collected by Vault contract |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 6 | 6 | - | - | N/A |
| 2 | 9 | 3 | 1 (Trader→Depositor) | 5 | 67% |
| 3 | 10 | 1 (Season) | 0 | 9 | 90% |
| 4 | 10 | 0 | 0 | 10 | 100% |
| 5 | 11 | 1 (MINT) | 0 | 10 | 92% |
| 6 | 12 | 1 (Strategy Type) | 0 | 11 | 92% |

도메인 모델 안정 수렴 — 핵심 엔티티(Agent, Leaderboard, Season, PaperPortfolio)는 4라운드 연속 고정.

## Interview Transcript
<details>
<summary>Full Q&A (6 rounds)</summary>

### Round 0 — Topology
**Q:** 웹으로 만들 범위가 어디야? (리더보드 UI / 페이퍼 엔진 / 에이전트 등록 / 결제·평판)
**A:** 1-3 + x402까지. ERC-8004은 솔직히 꼭 필요하냐? → ERC-8004 deferred 합의.

### Round 1
**Q:** 주 사용자가 누구야?
**A:** 둘 다, 1차 타겟은 트레이더.
**Ambiguity:** 73%

### Round 2
**Q:** 트레이더의 핵심 행동? 걸린 지갑 구조? 돈은 어디서 굴려?
**A:** 걸린 지갑에 돈 쏘면 우리 에이전트가 굴림, 자유 입출금, 수수료 붙음. (실자금 수탁 모델 등장) → 이어서: 규제 회피+수익+신뢰 최대화 방법으로.
**Ambiguity:** 66% → 64%

### Round 3
**Q:** 온체인 비수탁 볼트로 확정할까?
**A:** 대시보드는 $10k(조절가능) 페이퍼 경주, 월간 배치, D-n. 그거 보고 follow 선택. 온체인 볼트 걸자. + 핵심질문: 우리 지갑에 돈 들어와, 아니면 알고리즘만 제공하고 수수료?
**Ambiguity:** 45%

### Round 4 (Contrarian)
**Q:** 실자금 0원이어도 제품 90% 증명됨. 먼저 보고 싶은 v1은?
**A:** 1번(랭킹 대시보드만). 디자인 진짜 중요 — "와 돈 넣고싶다" 느낌 뽝 + 신뢰 + 최적화된 애니메이션.
**Ambiguity:** 30%

### Round 5 (Simplifier)
**Q:** 수익률 곡선이 진짜 데이터야 시뮬이야?
**A:** 실시간 페이퍼 엔진(2번)이기도 하고, MINT 봇에 실거래 데이터 있음(맥미니).
**Ambiguity:** 26%

### Round 6
**Q:** v1 완성 기준? 나머지 경주 참가자는? 어디서 보게 돼?
**A:** 1개 실(MINT)+4개 시뮬 + 배포 URL/공유. 월간 시즌마다 새 전략 추가해서 뭐가 잘 버나(폴리마켓/날씨arb/주식) 발견.
**Ambiguity:** 17% ✅ PASSED
</details>
