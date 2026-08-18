# Deep Interview Spec: Agora 유저사이드 — 라이브 볼트 & 리얼타임 Derby

## Metadata
- Interview ID: agora-vault-userside-2026-08-18
- Rounds: 4 (+ Round 0 토폴로지 게이트)
- Final Ambiguity Score: 10%
- Type: brownfield
- Generated: 2026-08-18
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: yes (세션 내 contract 레포 조사 + 카톡 분석 결과를 요약 반영)
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.92 | 0.35 | 0.322 |
| Constraint Clarity | 0.88 | 0.25 | 0.22 |
| Success Criteria | 0.90 | 0.25 | 0.225 |
| Context Clarity | 0.90 | 0.15 | 0.135 |
| **Total Clarity** | | | **0.902** |
| **Ambiguity** | | | **0.098 (10%)** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| 앱 셸/네비 | active | Derby ↔ My Vault 두 모드 헤더 + 지갑 연결 버튼 상시 노출 | R0 확정, 기존 레이아웃 확장 |
| 온보딩 (/vault/onboarding) | active | 지갑 연결 → 입금 → 볼트 생성 3단계 | 기본 정책값은 안전 기본값 자동 적용 |
| 볼트 대시보드 (/vault) | active | 잔액/상태/성과/라이브 활동 피드/액션. 별도 데모 화면 없음 — 피드 자체가 라이브 | R2에서 "각본 데모" 제거, "리얼타임 워킹"으로 전환 |
| 긴급탈출 UX | active | 전량청산 / 정지+USDC회수 2경로, 확인 모달 | 법적 필수. min_fiat_output 실시세 기반 계산 |
| 리스크 설정 (/vault/settings) | active | configure_execution_policy 폼 | 핵심 필드 + 고급 아코디언 |
| 지갑/데이터 통합 레이어 | active | dApp Kit 실지갑 + VaultDataSource mock/real 토글 + LiveStrategyEngine(실시세) | R1·R3 확정 |

## Goal

**한 줄:** 기존 Agora Agent Derby v1 위에, 실시세로 진짜 움직이는 라이브 전략 엔진과 Sui Testnet 볼트 유저사이드(온보딩→대시보드→긴급탈출→설정)를 얹어, 오늘 안에 빌드→TheZoneAgora/FE 푸시→Vercel 배포까지 완료한다.

세부:
1. **앱 전체가 살아 움직인다.** Derby 홈(/)과 볼트 대시보드 모두 실제 암호화폐 시세 피드를 받아, 각 전략(모멘텀/역발상/그리드 등)이 실가격에 반응해 페이퍼 포지션을 잡고 손익이 실시간으로 변한다. 경주마처럼. 각본 있는 데모 연출은 만들지 않는다.
2. **유저사이드 완성.** 지갑 연결(실제 dApp Kit) → 볼트 생성 온보딩 → 개인 대시보드(잔액/Agent 상태/활동 피드) → 긴급탈출 2경로 → 리스크 설정.
3. **mock/real 토글.** 컨트랙트 호출은 VaultDataSource 인터페이스 뒤에 real 구현(PTB 빌더)까지 짜두되, .env 실값(AGORA_AGENT_OPERATOR, testnet USDC 타입)이 없으면 mock 모드로 동작. 값 받으면 플래그만 전환.
4. **게스트 데모 볼트.** 지갑 미연결 방문자(심사위원 포함)는 /vault에서 라이브로 움직이는 데모 볼트를 즉시 본다. 상단 배너: "데모 볼트 — 지갑을 연결하면 내 볼트를 만들 수 있어요".

## Constraints

- **UI 언어: 한국어.** (숫자·티커·기술 용어는 영문 유지 가능)
- **디자인: design/design.md 완전 준수.** orange #FF5A1F / arena-black #11100F / warm-ivory #FFF8ED, Inter + tabular-nums, 4px 그리드, radius 24/16/12, 모션 160–240ms cubic-bezier(0.22,1,0.36,1). 오렌지는 신호용으로만(선두/액션/라이브). 손익은 #24C77A/#F04F5F + 부호 병기. 구 spec의 purple/cyan 팔레트는 폐기됨.
- **긴급탈출은 파괴적 액션 스타일** — 오렌지 금지, negative-red 계열 + 확인 모달.
- **기존 v1 코드 보존·확장.** AgentDataSource 인터페이스 패턴 유지. 기존 컴포넌트(Leaderboard, RaceTrack, EquityCurveChart 등)는 라이브 틱 구독으로 업그레이드하되 시각 정체성 유지.
- **실시세 피드:** Binance 공개 REST(`api.binance.com/api/v3/ticker/price`, 키 불필요, CORS 허용)를 5–10초 폴링. 실패 시 CoinGecko simple/price 폴백, 그것도 실패 시 마지막 가격에서 랜덤워크 유지(화면이 멈추면 안 됨). 심볼: SUIUSDT, BTCUSDT, ETHUSDT, SOLUSDT (전략별 배정).
- **엔진 상태 지속성:** LiveStrategyEngine 상태(포지션/손익 곡선/피드 이력)는 localStorage에 저장 — 새로고침해도 곡선이 리셋되지 않아야 함.
- **Testnet만.** 메인넷 경로 없음. 컨트랙트: `agent_market` @ `0x0f5a55d4768a22382295652b415c0df973db45e4ac1d65c8ceadc3a331c68bfa` (Sui Testnet).
- **BE/Providing Agent 부재 전제.** 시그널 검증·Trust Score는 LiveStrategyEngine이 클라이언트에서 생성하는 mock (단, 실가격 기반이라 손익은 진짜 계산).
- **신규 의존성 최소:** `@mysten/dapp-kit`, `@mysten/sui`, `@tanstack/react-query`만 추가.

## Non-Goals
- 각본형 데모 컨트롤 패널 / 숨겨진 트리거 (사용자가 명시적으로 제외)
- Providing Agent 서버, x402 연동, 실제 AgoraAgent 자동거래 실행
- 리더보드 실데이터 백엔드 (MINT ingest는 기존 것 유지)
- 사용자 계정/인증 시스템 (지갑 = 신원)
- 메인넷 지원, 다중 볼트 UI (1지갑 1볼트 가정)

## Acceptance Criteria
- [ ] `npm run build` 에러 없이 통과
- [ ] `/` Derby: 에이전트들이 실시세 폴링 틱마다 순위·곡선·수익률이 실제로 움직임 (하드리로드 없이)
- [ ] `/vault` 지갑 미연결: 게스트 데모 볼트가 라이브로 표시 + 연결 유도 배너
- [ ] `/vault` 지갑 연결(mock 모드): 내 볼트 잔액/Agent 상태 배지(ACTIVE 초록·REDUCE_ONLY 노랑·PAUSED 빨강)/라이브 활동 피드(시그널 수신→검증→실행 or 거부 이벤트가 실시간 흐름)/액션 버튼 전부 동작
- [ ] `/vault/onboarding`: 지갑연결→입금액 입력→볼트 생성 3단계 완주 시 /vault로 이동 (mock 모드에서 전 과정 동작)
- [ ] 긴급탈출 모달: 전량청산·정지+회수 2경로 분리, 타이핑 확인, min_fiat_output이 현재 시세×(1-슬리피지허용) 로 자동 계산되어 0이 아님
- [ ] `/vault/settings`: 핵심 리스크 필드 폼 + 고급 아코디언, 저장 시 mock 상태 반영
- [ ] real 모드 코드 경로 존재: PTB 빌더(create_vault/deposit_more/withdraw/emergency 2종/configure_execution_policy) 구현 완료, env 값 주입 시 동작하도록 배선 (실행 검증은 env 값 수령 후)
- [ ] 지갑 연결 버튼(dApp Kit ConnectButton)이 헤더에서 실제 Sui 지갑과 연결됨
- [ ] UI 전체 한국어
- [ ] TheZoneAgora/FE.git에 푸시 완료
- [ ] Vercel 배포 완료, 라이브 URL 확보

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 데모는 각본 연출이 필요하다 | R2에서 연출 방식 질문 | **뒤집힘** — 연출 불필요, 실시세 기반 리얼타임 워킹이 목표 |
| 라이브 엔진은 볼트 전용 | R3 적용 범위 질문 | Derby 홈 + 볼트 모두 같은 엔진 공유 |
| /vault는 지갑 연결이 게이트 | R4 Contrarian: 지갑 없는 심사위원은? | 게스트 데모 볼트 자동 표시로 전환 |
| 오늘 실 온체인 연동 강행 | R1 통합 깊이 질문 | 실지갑 + mock/real 토글, env 값은 진웅 대기 |
| UI는 영어(해커톤용) | R4 언어 질문 | **한국어**로 확정 |

## Technical Context

### 기존 코드베이스 (확장 대상)
- Next.js 15 App Router, TS, Tailwind, framer-motion 11, lightweight-charts 4
- `app/page.tsx` + `components/DashboardClient.tsx` — Derby 홈 (라이브화 대상)
- `lib/data/AgentDataSource.ts` — 스왑 가능 데이터 인터페이스 (패턴 유지)
- `lib/data/sim/StrategySimulator.ts` — 결정론적 곡선 생성기 (라이브 틱 엔진의 기반으로 개조)
- `design/design.md` — 브랜드 시스템 (완전 준수)
- git origin: METHEZONE/thezoneagora → **팀 리모트 추가 필요**: `git remote add team https://github.com/TheZoneAgora/FE.git` 후 `git push team main`

### 컨트랙트 통합 (real 모드)
- 패키지: `0x0f5a55d4768a22382295652b415c0df973db45e4ac1d65c8ceadc3a331c68bfa` (Testnet)
- 참조 SDK: `TheZoneAgora/contract` → `sui-contract/sources/Dex/Vault_Dex.js` (PTB 빌더 — TS로 포팅해서 lib/sui/에 배치)
- Owner 함수: create_vault(deposit, agora_agent_operator, 한도4종) / deposit_more / withdraw_all_assets / withdraw_amount / withdraw_crypto_amount / revoke_agent / reactivate_agent / set_reduce_only / configure_execution_policy(12파라미터) / emergency_liquidate_all(executor 경유, min_fiat_output+deadline 필수) / emergency_pause_and_withdraw_fiat
- 조회: fiat_balance / crypto_balance / is_agora_agent_active / is_reduce_only / is_paused / realized_loss_amount / window_loss_amount / daily_fiat_volume / max_risk_score_bps
- 이벤트(피드 매핑): OrderExecuted, DeepBookOrderExecuted, KillSwitchTriggered, EmergencyLiquidated, EmergencyFiatWithdrawn
- UserVault는 shared object — 볼트 발견: 생성 tx digest에서 vault ID 추출 → localStorage 저장, 수동 vault ID 입력 폴백 UI 제공
- env (real 모드 필수, 현재 미확보 → 없으면 자동 mock):
  - `NEXT_PUBLIC_AGENT_MARKET_PACKAGE_ID` (확보됨, 위 값)
  - `NEXT_PUBLIC_AGORA_AGENT_OPERATOR` (진웅 대기)
  - `NEXT_PUBLIC_AGORA_FIAT_COIN_TYPE` (testnet USDC 타입, 진웅 대기)
  - `NEXT_PUBLIC_AGORA_CRYPTO_COIN_TYPE` = `0x2::sui::SUI`
  - `NEXT_PUBLIC_VAULT_MODE` = `mock` | `real` (기본 mock)

### 신규 아키텍처
```
lib/live/PriceFeed.ts          Binance 폴링(5–10s) → CoinGecko 폴백 → 랜덤워크 유지
lib/live/LiveStrategyEngine.ts 전략별 실가격 반응 페이퍼 트레이딩, Signal/ActivityEvent 발행,
                               localStorage 지속성, 구독 API (Derby+Vault 공유 싱글턴)
lib/vault/VaultDataSource.ts   인터페이스: 조회/입출금/긴급탈출/정책설정
lib/vault/MockVaultSource.ts   게스트 데모 볼트 + 연결 지갑용 mock 상태 (LiveEngine 시그널 소비)
lib/vault/SuiVaultSource.ts    real 구현 — PTB 빌더 + dApp Kit signAndExecute + RPC 조회
lib/sui/transactions.ts        Vault_Dex.js에서 포팅한 PTB 빌더들
app/vault/page.tsx             대시보드 (게스트/연결 분기)
app/vault/onboarding/page.tsx  3단계 온보딩
app/vault/settings/page.tsx    리스크 정책 폼
components/vault/*             VaultHeader, BalanceCards, AgentStatusBadge, ActivityFeed,
                               EmergencyExitModal, PolicyForm 등
```

### 온보딩 기본 정책값 (USDC 6 decimals)
| 파라미터 | 기본값 | 비고 |
|---|---|---|
| max_trade_amount | 100 USDC | 1회 한도 |
| max_epoch_trade_amount | 500 USDC | epoch 한도 |
| max_crypto_sell_amount / epoch | 100 / 500 상당 | |
| max_daily_fiat_volume | 500 USDC | settings에서 조정 |
| max_loss_amount | 100 USDC | 누적 손실 한도 |
| max_risk_score_bps | 7000 | BUY 위험도 상한 |
| loss_window_ms / max_window_loss | 1h / 50 USDC | Kill Switch |
| max_price_deviation_bps | 500 | |
| max_signal_delay_ms | 300000 | |
온보딩에서는 입금액만 받고 나머지는 위 기본값 + "설정에서 언제든 조정" 안내.

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| UserVault | core domain | fiatBalance, cryptoBalance, status, policy, owner | WalletSession이 소유, RiskPolicy 포함 |
| LiveStrategyEngine | core domain | strategies[], prices, positions, pnlSeries | PriceFeed 소비, Signal 발행 |
| PriceFeed | external system | symbols, lastPrices, source(binance/gecko/walk) | LiveStrategyEngine에 공급 |
| Signal | core domain | id, side, price, riskScoreBps, verdict(승인/거부), reason | ActivityEvent로 변환 |
| ActivityEvent | supporting | type(5종 온체인 이벤트+시그널), timestamp, payload | 피드에 렌더 |
| RiskPolicy | supporting | 한도 12필드 | UserVault 소속, settings 폼 대상 |
| WalletSession | supporting | address, connected, network | dApp Kit 상태 |
| VaultDataSource | supporting | mode(mock/real) | Mock/Sui 구현 스왑 |
| AgoraAgent | supporting | operator, status(ACTIVE/REDUCE_ONLY/PAUSED) | UserVault 정책 대상 |
| GuestDemoVault | supporting | 사전 시드 상태 | 미연결 시 MockVaultSource가 제공 |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 7 | 7 | - | - | N/A |
| 2 | 9 | 1(LiveStrategyEngine) | 0 | 7 (DemoController 제거) | 78% |
| 3 | 9 | 1(PriceFeed) | 0 | 8 | 89% |
| 4 | 10 | 1(GuestDemoVault) | 0 | 9 | 90% |

## Interview Transcript
<details>
<summary>Full Q&A (Round 0 + 4 rounds)</summary>

### Round 0 — 토폴로지
**Q:** 6개 컴포넌트(셸/온보딩/대시보드/긴급탈출/설정/통합레이어) 맞나? 데모 시연 화면은 별도 7번?
**A:** 6개 맞음. 데모 시연은 피드에 포함.

### Round 1 — 통합 깊이
**Q:** 오늘 빌드의 온체인 통합 깊이는?
**A:** 실지갑(dApp Kit) + mock/real 토글. real 구현까지 짜두고 env 값 없으면 mock 동작.
**Ambiguity:** 23%

### Round 2 — 데모 연출
**Q:** mock 시그널 스트림 + 데모 순간 연출 방식은?
**A:** "데모까지 안 보여줘도 돼. 그냥 실시간으로 워킹하는 거. 리얼타임 데이터, 실제 전략으로 움직이는 애들, 경주마처럼." → 각본 연출 스코프 아웃, 리얼타임이 성공 기준으로 전환.
**Ambiguity:** 21%

### Round 3 — 라이브 소스/범위
**Q:** 라이브 움직임의 데이터 원천? 적용 범위?
**A:** 실제 시세 피드 기반 + Derby 홈·볼트 둘 다.
**Ambiguity:** 18%

### Round 4 — Contrarian + 마감 기준
**Q:** 지갑 없는 방문자가 /vault에 오면? / 완료 판정 기준? / UI 언어?
**A:** 게스트 데모 볼트 자동 표시 / build 통과+전화면 동작+FE 푸시+Vercel 배포 / 한국어.
**Ambiguity:** 10% ✅

</details>
