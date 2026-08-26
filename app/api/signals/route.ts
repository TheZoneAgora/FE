import { NextResponse } from "next/server";
import { buildAllSignals } from "@/lib/live/signalApi";

// GET /api/signals — 5개 에이전트 전부의 최신 판단 시그널 요약.
// 실시간 시세(Binance klines)를 매 요청마다 새로 받아 전략을 처음부터 재생하므로
// 서버 상태가 없다(서버리스에서도 안전). 캐싱 금지 — 항상 최신 시세 기준.
export const dynamic = "force-dynamic";
// Binance는 미국 IP를 차단한다(HTTP 451) — Vercel 기본 리전이 미국이라 서울로 고정.
export const preferredRegion = "icn1";

export async function GET() {
  try {
    const signals = await buildAllSignals();
    return NextResponse.json({ agents: signals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "시그널 계산에 실패했습니다." },
      { status: 502 }
    );
  }
}
