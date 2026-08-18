"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { getVaultDataSource } from "@/lib/vault";
import type {
  VaultActivityEvent,
  VaultState,
} from "@/lib/vault/types";
import type {
  CreateVaultParams,
  EmergencyLiquidateAllParams,
  VaultDataSource,
} from "@/lib/vault/VaultDataSource";
import { getLiveStrategyEngine } from "@/lib/live/LiveStrategyEngine";

const MAX_FEED_LENGTH = 200;

export interface UseVaultResult {
  /** 연결된 지갑 주소. 미연결이면 null → 게스트 데모 볼트 표시. */
  owner: string | null;
  /** 게스트 또는 내 볼트 상태. 로딩 전엔 null. */
  vault: VaultState | null;
  /** 이 지갑에 볼트가 있는지 (게스트는 항상 true — 데모 볼트가 있으므로). */
  hasVault: boolean | null;
  loading: boolean;
  /** 최신순 활동 피드 (구독으로 실시간 누적). */
  activity: VaultActivityEvent[];
  source: VaultDataSource;
  actions: {
    createVault: (params: CreateVaultParams) => Promise<VaultState>;
    depositMore: (amount: bigint) => Promise<VaultState>;
    withdrawAmount: (amount: bigint) => Promise<VaultState>;
    withdrawAll: () => Promise<VaultState>;
    revokeAgent: () => Promise<VaultState>;
    reactivateAgent: () => Promise<VaultState>;
    setReduceOnly: (reduceOnly: boolean) => Promise<VaultState>;
    configurePolicy: (
      policy: Parameters<VaultDataSource["configurePolicy"]>[1]
    ) => Promise<VaultState>;
    emergencyLiquidateAll: (
      params: EmergencyLiquidateAllParams
    ) => Promise<VaultState>;
    emergencyPauseAndWithdraw: () => Promise<VaultState>;
    refresh: () => Promise<void>;
  };
}

/**
 * 볼트 화면들이 공유하는 단일 훅.
 * - 지갑 미연결 → 게스트 데모 볼트
 * - 지갑 연결 → 해당 owner의 볼트 (없으면 hasVault=false, 온보딩 유도)
 * - LiveStrategyEngine을 mock 소스에 attach해 시그널 파이프라인이 피드로 흐르게 한다.
 */
export function useVault(): UseVaultResult {
  const account = useCurrentAccount();
  const owner = account?.address ?? null;
  const source = useMemo(() => getVaultDataSource(), []);

  const [vault, setVault] = useState<VaultState | null>(null);
  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<VaultActivityEvent[]>([]);

  // 라이브 엔진을 볼트 소스에 연결 (mock 전용 주입 지점, 있을 때만).
  useEffect(() => {
    const maybeAttach = source as unknown as {
      attachEngine?: (engine: unknown, options?: { owner?: string | null }) => void;
    };
    if (typeof maybeAttach.attachEngine === "function") {
      maybeAttach.attachEngine(getLiveStrategyEngine(), { owner });
    }
  }, [source, owner]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (owner) {
        const exists = await source.hasVault(owner);
        setHasVault(exists);
        setVault(exists ? await source.getVaultState(owner) : null);
      } else if (source.getGuestVault) {
        setHasVault(true);
        setVault(await source.getGuestVault());
      } else {
        setHasVault(false);
        setVault(null);
      }
      // 저장된 이력으로 피드를 시드해 첫 진입 시 빈 화면을 피한다 (mock 전용).
      if (source.getActivityHistory) {
        setActivity(await source.getActivityHistory(owner));
      }
    } finally {
      setLoading(false);
    }
  }, [owner, source]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 상태/활동 실시간 구독. owner가 일치하는 이벤트(또는 게스트 이벤트)만 반영.
  useEffect(() => {
    return source.subscribe((event) => {
      const mine = owner ? event.owner === owner : event.owner === null;
      if (!mine) return;
      setVault(event.state);
      if (event.activity) {
        setActivity((prev) =>
          [event.activity as VaultActivityEvent, ...prev].slice(0, MAX_FEED_LENGTH)
        );
      }
    });
  }, [source, owner]);

  const actions = useMemo(
    () => ({
      createVault: async (params: CreateVaultParams) => {
        if (!owner) throw new Error("지갑을 먼저 연결해 주세요.");
        const state = await source.createVault(owner, params);
        setHasVault(true);
        setVault(state);
        return state;
      },
      depositMore: (amount: bigint) => mustOwner(owner, (o) => source.depositMore(o, amount)),
      withdrawAmount: (amount: bigint) => mustOwner(owner, (o) => source.withdrawAmount(o, amount)),
      withdrawAll: () => mustOwner(owner, (o) => source.withdrawAll(o)),
      revokeAgent: () => mustOwner(owner, (o) => source.revokeAgent(o)),
      reactivateAgent: () => mustOwner(owner, (o) => source.reactivateAgent(o)),
      setReduceOnly: (reduceOnly: boolean) =>
        mustOwner(owner, (o) => source.setReduceOnly(o, reduceOnly)),
      configurePolicy: (policy: Parameters<VaultDataSource["configurePolicy"]>[1]) =>
        mustOwner(owner, (o) => source.configurePolicy(o, policy)),
      emergencyLiquidateAll: (params: EmergencyLiquidateAllParams) =>
        mustOwner(owner, (o) => source.emergencyLiquidateAll(o, params)),
      emergencyPauseAndWithdraw: () =>
        mustOwner(owner, (o) => source.emergencyPauseAndWithdraw(o)),
      refresh,
    }),
    [owner, source, refresh]
  );

  return { owner, vault, hasVault, loading, activity, source, actions };
}

function mustOwner(
  owner: string | null,
  fn: (owner: string) => Promise<VaultState>
): Promise<VaultState> {
  if (!owner) return Promise.reject(new Error("지갑을 먼저 연결해 주세요."));
  return fn(owner);
}
