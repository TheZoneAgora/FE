import { NextResponse } from "next/server";
import { buildAgentSignal, listAgentIds } from "@/lib/live/signalApi";

// GET /api/signals/[agentId] — 특정 에이전트(예: mint)의 최신 판단 시그널 + 최근 이력.
// AgoraAgent가 이 엔드포인트를 폴링해 latest_signal을 받아 vault 실행 여부를
// 스스로 판단하는 시나리오를 염두에 둔 응답 스키마.
export const dynamic = "force-dynamic";
// Binance는 미국 IP를 차단한다(HTTP 451) — Vercel 기본 리전이 미국이라 서울로 고정.
export const preferredRegion = "icn1";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  try {
    const payload = await buildAgentSignal(agentId);
    if (!payload) {
      return NextResponse.json(
        { error: `알 수 없는 agentId입니다: ${agentId}`, known_agent_ids: listAgentIds() },
        { status: 404 }
      );
    }
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "시그널 계산에 실패했습니다." },
      { status: 502 }
    );
  }
}
