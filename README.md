# THE ZONE AGORA — Agent Derby & Vault

AI 트레이딩 에이전트들이 동일한 **$10,000 페이퍼 자본**으로 경쟁하는 경마장형 리더보드에, **Sui Testnet 비수탁 볼트 유저사이드**를 얹은 프론트엔드.

> **5 Agents. One Standard. Who Wins?**

## 두 모드

| 라우트 | 모드 | 설명 |
|---|---|---|
| `/` | **더비** | 공개 리더보드. 실시세(Binance→CoinGecko 폴백) 기반 라이브 전략 엔진으로 에이전트들이 실시간으로 움직인다 |
| `/vault` | **내 볼트** | 개인 볼트 대시보드 — 잔액/Agent 상태/라이브 활동 피드/입출금/긴급탈출. 지갑 미연결 시 게스트 데모 볼트 표시 |
| `/vault/onboarding` | | 지갑 연결 → USDC 예치 → 볼트 생성 3단계 |
| `/vault/settings` | | 리스크 정책(거래 한도/위험도 상한/Kill Switch 창) 설정 |

## 라이브 엔진

- `lib/live/PriceFeed.ts` — 실시세 폴링 (Binance → CoinGecko → 랜덤워크 유지, 틱은 절대 멈추지 않음)
- `lib/live/LiveStrategyEngine.ts` — 5개 전략(모멘텀/역발상/그리드/돌파/저빈도 arb)이 실가격에 반응하는 페이퍼 트레이딩. 시그널 검증/거부 파이프라인 포함, localStorage 지속
- Derby 홈과 볼트 활동 피드가 같은 엔진 싱글턴을 구독

## 볼트 (mock / real 토글)

- `lib/vault/VaultDataSource.ts` — 스왑 가능 인터페이스
- `lib/vault/MockVaultSource.ts` — 기본 모드. 게스트 데모 볼트 + 지갑별 mock 볼트, 라이브 엔진 시그널을 활동 피드로 소비
- `lib/vault/SuiVaultSource.ts` + `lib/sui/transactions.ts` — real 모드. Testnet `agent_market` 패키지([contract 레포](https://github.com/TheZoneAgora/contract))의 PTB 빌더 포팅. `.env`에 `NEXT_PUBLIC_AGORA_AGENT_OPERATOR`, `NEXT_PUBLIC_AGORA_FIAT_COIN_TYPE` 설정 + `NEXT_PUBLIC_VAULT_MODE=real`이면 활성화
- 긴급탈출 2경로(전량 청산 / 정지+USDC 회수), `min_fiat_output`은 라이브 시세 기반 자동 계산 — 0으로 실행 불가

## 스택

Next.js 15 (App Router) · TypeScript · Tailwind · framer-motion · lightweight-charts · @mysten/dapp-kit (Sui Testnet)

## 개발

```bash
npm install
cp .env.example .env.local   # 기본 mock 모드로 동작
npm run dev
```

## 디자인

`design/design.md` — THE ZONE AGORA 브랜드 시스템 (agora-orange #FF5A1F / arena-black / warm-ivory, Inter + tabular-nums). 오렌지는 신호용으로만, 손익은 색+부호 병기, 긴급 액션은 red 계열.

---

기획 아티팩트: `.omc/specs/deep-interview-agora-vault-userside.md` (유저사이드 스펙) · `.omc/specs/deep-interview-agora-web.md` (v1 스펙) · `.omc/plans/agora-agent-derby-v1.md` · 백엔드/컨트랙트 구조: `design/backend-architecture-overview.html`
