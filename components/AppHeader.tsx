"use client";

// design/agora-arena.html 헤더 포팅: 마크+워드마크 / 시즌 칩 + 내 볼트 + 지갑 연결.
// arena.css의 CSS 변수·리셋을 쓰기 위해 이 헤더 자체도 `agora-arena` 스코프 클래스를 갖는다
// (레이아웃상 홈 화면의 `.agora-arena` 컨테이너 바깥에서 렌더링되기 때문).

import Link from "next/link";
import { ConnectButton } from "@mysten/dapp-kit";
import { AgoraMark } from "@/components/arena/AgoraMark";
import "@/components/arena/arena.css";

export function AppHeader() {
  return (
    <header className="ar-header agora-arena">
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
          <ConnectButton connectText="지갑 연결" className="btn ghost" />
        </div>
      </div>
    </header>
  );
}
