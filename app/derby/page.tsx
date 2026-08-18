import { buildSnapshot } from "@/lib/snapshot";
import { DashboardClient } from "@/components/DashboardClient";

// 기존 Agora Agent Derby v1 페이퍼 리더보드 — /agora 아레나 리뉴얼 이후에도
// 원본 대시보드를 그대로 보존해두는 라우트. 서버 컴포넌트: 매 요청 시 스냅샷 조회.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DerbyPage() {
  const snapshot = await buildSnapshot();
  return <DashboardClient snapshot={snapshot} />;
}
