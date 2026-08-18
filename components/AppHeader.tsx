"use client";

// design/agora-arena.html 헤더 포팅: 마크+워드마크 / 시즌 칩 + 내 볼트 + 지갑 연결.
// `.ar-header` 셀렉터가 필요한 색·폰트 변수를 전부 자체적으로 재선언하므로
// (arena.css 상단) 레이아웃 부수효과가 있는 `.agora-arena` 클래스는 여기 붙이지 않는다
// — 붙이면 헤더에 `min-height:100vh`가 걸려 화면 전체가 깨진다.
//
// 지갑 연결은 dApp Kit 기본 ConnectButton 대신 WalletConnectProvider(스킵 옵션 있는
// 커스텀 모달, app/providers.tsx에서 전역 장착)를 써서 다른 화면과 동일한 흐름을 쓴다.

import Link from "next/link";
import { AgoraMark } from "@/components/arena/AgoraMark";
import { useWalletConnect } from "@/components/arena/WalletConnect";
import "@/components/arena/arena.css";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function AppHeader() {
  const wallet = useWalletConnect();

  return (
    <header className="ar-header">
      <div className="wrap">
        <Link href="/" className="brand">
          <AgoraMark />
          <span className="wordmark">
            <span className="z">THE ZONE</span>
            <span className="a">AGORA</span>
          </span>
        </Link>
        <div className="hd-right">
          <span className="season-chip num">
            <i /> SEASON 1 · LIVE
          </span>
          <Link href="/vault" className="btn ghost">
            내 볼트
          </Link>
          {wallet.connected && wallet.address ? (
            <button
              type="button"
              className="wallet-chip num"
              onClick={() => wallet.disconnect()}
              title="연결 해제"
            >
              <span className="dot" />
              {shortenAddress(wallet.address)}
            </button>
          ) : (
            <button type="button" className="btn ghost" onClick={() => wallet.requestConnect()}>
              지갑 연결
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
