"use client";

import Link from "next/link";
import { useVault } from "@/lib/vault/useVault";
import { AgentStatusBadge } from "@/components/vault/AgentStatusBadge";
import { BalanceCards } from "@/components/vault/BalanceCards";
import { VaultPerformance } from "@/components/vault/VaultPerformance";
import { ActivityFeed } from "@/components/vault/ActivityFeed";
import { ActionBar } from "@/components/vault/ActionBar";
import { CharacterRow } from "@/components/vault/CharacterRow";

export default function VaultPage() {
  const { owner, vault, hasVault, loading, activity, actions } = useVault();

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-arena-black">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6">
          <p className="text-[13px] text-muted-light">볼트 정보를 불러오는 중…</p>
        </div>
      </main>
    );
  }

  // 지갑 연결 + 볼트 없음 → 온보딩 유도.
  if (owner && hasVault === false) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-arena-black">
        <div className="mx-auto flex max-w-[640px] flex-col items-center px-5 py-24 text-center lg:px-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-light">
            내 볼트
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-warm-ivory">
            아직 볼트가 없습니다
          </h1>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted-light">
            지갑 연결을 확인했습니다. 온보딩을 완료하면 실시세 기반 라이브 전략이 내 볼트에서 바로
            동작합니다.
          </p>
          <Link
            href="/vault/onboarding"
            className="mt-6 rounded-xl bg-agora-orange px-6 py-3 text-[14px] font-bold text-arena-black transition-opacity hover:opacity-90"
          >
            볼트 만들기
          </Link>
        </div>
      </main>
    );
  }

  if (!vault) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-arena-black">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6">
          <p className="text-[13px] text-muted-light">볼트 정보를 불러오는 중…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-arena-black">
      <div className="mx-auto max-w-[1200px] px-5 py-10 lg:px-6">
        {vault.isGuest && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-agora-orange/30 bg-agora-orange/10 px-4 py-3">
            <p className="text-[13px] font-medium text-agora-orange">
              데모 볼트 — 지갑을 연결하면 내 볼트를 만들 수 있어요
            </p>
            <CharacterRow size={40} className="hidden sm:flex" />
          </div>
        )}

        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CharacterRow size={56} className="hidden md:flex" />
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-light">
                {vault.isGuest ? "데모 볼트" : "내 볼트"}
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-warm-ivory">
                볼트 대시보드
              </h1>
            </div>
          </div>
          <AgentStatusBadge status={vault.agentStatus} />
        </header>

        <div className="mb-6">
          <BalanceCards vault={vault} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <VaultPerformance vault={vault} />
          <ActivityFeed activity={activity} />
        </div>

        {!vault.isGuest && owner && (
          <div className="mt-6">
            <ActionBar vault={vault} actions={actions} />
          </div>
        )}
      </div>
    </main>
  );
}
