"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useVault } from "@/lib/vault/useVault";
import {
  DEFAULT_EXECUTION_POLICY_EXTRAS,
  DEFAULT_RISK_POLICY,
} from "@/lib/vault/types";
import type { RiskPolicy } from "@/lib/vault/types";
import {
  buildDiff,
  buildFormState,
  msToMinutesLabel,
  msToSecondsLabel,
  parseForm,
  type RiskFormState,
  type TradingWindow,
} from "./policyFormUtils";
import { AmountField, BpsField, MsField, RiskScoreField, TimeRangeField } from "./fields";
import { AdvancedAccordion } from "./AdvancedAccordion";
import { SaveToast } from "./SaveToast";

export function RiskPolicySettings() {
  const { owner, vault, hasVault, loading, actions } = useVault();
  const vaultKey = owner ?? "guest";

  const initializedKeyRef = useRef<string | null>(null);
  const [form, setForm] = useState<RiskFormState | null>(null);
  const [baselinePolicy, setBaselinePolicy] = useState<RiskPolicy | null>(null);
  const [baselineExtras, setBaselineExtras] = useState<TradingWindow>(
    DEFAULT_EXECUTION_POLICY_EXTRAS
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "positive" | "negative" } | null>(
    null
  );

  useEffect(() => {
    if (!vault || initializedKeyRef.current === vaultKey) return;
    initializedKeyRef.current = vaultKey;
    setBaselinePolicy(vault.policy);
    setBaselineExtras(DEFAULT_EXECUTION_POLICY_EXTRAS);
    setForm(buildFormState(vault.policy, DEFAULT_EXECUTION_POLICY_EXTRAS));
  }, [vault, vaultKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const parsed = useMemo(() => (form ? parseForm(form) : null), [form]);
  const diff = useMemo(() => {
    if (!parsed || !baselinePolicy) return {};
    return buildDiff(parsed.values, baselinePolicy, baselineExtras);
  }, [parsed, baselinePolicy, baselineExtras]);

  const isGuest = !owner;
  const canEdit = !isGuest && !!vault && !!form && !!baselinePolicy;
  const hasErrors = parsed ? Object.keys(parsed.errors).length > 0 : false;
  const isDirty = Object.keys(diff).length > 0;
  const errors = parsed?.errors ?? {};

  function update<K extends keyof RiskFormState>(key: K, value: RiskFormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!canEdit || hasErrors || !isDirty || saving) return;
    setSaving(true);
    try {
      const updated = await actions.configurePolicy(diff);
      setBaselinePolicy(updated.policy);
      setBaselineExtras((prev) => ({
        tradingStartMinuteUtc: diff.tradingStartMinuteUtc ?? prev.tradingStartMinuteUtc,
        tradingEndMinuteUtc: diff.tradingEndMinuteUtc ?? prev.tradingEndMinuteUtc,
      }));
      setToast({ message: "저장되었습니다.", tone: "positive" });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "저장에 실패했습니다.",
        tone: "negative",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleResetDefaults() {
    if (!canEdit) return;
    setForm(buildFormState(DEFAULT_RISK_POLICY, DEFAULT_EXECUTION_POLICY_EXTRAS));
  }

  if (loading && !vault) {
    return (
      <p className="text-[14px] text-[#B9B0A5]">볼트 정보를 불러오는 중입니다…</p>
    );
  }

  if (!vault && owner && hasVault === false) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <p className="text-[14px] text-[#B9B0A5]">
          아직 볼트가 없어요. 온보딩을 완료하면 리스크 정책을 조정할 수 있습니다.
        </p>
        <Link
          href="/vault/onboarding"
          className="inline-flex w-fit items-center rounded-xl bg-[#FF5A1F] px-4 py-2 text-[13px] font-semibold text-[#11100F] transition-opacity duration-200 hover:opacity-90"
        >
          볼트 만들기
        </Link>
      </div>
    );
  }

  if (!vault || !form) {
    return (
      <p className="text-[14px] text-[#B9B0A5]">볼트 정보를 불러오는 중입니다…</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {isGuest && (
        <div className="rounded-2xl border border-[#FF5A1F]/30 bg-[#FF5A1F]/[0.06] px-5 py-4">
          <p className="text-[13px] font-semibold text-[#FFF8ED]">
            데모 볼트 정책은 읽기 전용이에요.
          </p>
          <p className="mt-1 text-[13px] text-[#B9B0A5]">
            내 볼트를 만들면 조정할 수 있어요.{" "}
            <Link href="/vault/onboarding" className="font-semibold text-[#FF5A1F]">
              볼트 만들러 가기
            </Link>
          </p>
        </div>
      )}

      <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-[#1B1917] p-5">
        <h2 className="text-[15px] font-bold tracking-tight text-[#FFF8ED]">핵심 한도</h2>

        <AmountField
          label="1회 거래 한도"
          description="이 금액을 넘는 단일 거래 요청은 온체인에서 거부됩니다."
          value={form.maxTradeAmount}
          onChange={(v) => update("maxTradeAmount", v)}
          disabled={isGuest}
          error={errors.maxTradeAmount}
        />
        <AmountField
          label="Epoch 거래 한도"
          description="정산 기간(epoch) 동안 누적 거래 요청이 이 금액을 넘으면 거부됩니다."
          value={form.maxEpochTradeAmount}
          onChange={(v) => update("maxEpochTradeAmount", v)}
          disabled={isGuest}
          error={errors.maxEpochTradeAmount}
        />
        <AmountField
          label="일일 최대 거래대금"
          description="하루 동안 처리 가능한 총 거래대금 한도입니다."
          value={form.maxDailyFiatVolume}
          onChange={(v) => update("maxDailyFiatVolume", v)}
          disabled={isGuest}
          error={errors.maxDailyFiatVolume}
        />
        <AmountField
          label="최대 누적 손실"
          description="누적 손실이 이 금액을 넘으면 Kill Switch가 발동해 에이전트가 정지됩니다."
          value={form.maxLossAmount}
          onChange={(v) => update("maxLossAmount", v)}
          disabled={isGuest}
          error={errors.maxLossAmount}
        />
        <RiskScoreField
          label="시그널 위험도 상한"
          description="이 위험도를 넘는 매수 시그널은 자동으로 거부됩니다."
          value={form.maxRiskScoreBps}
          onChange={(v) => update("maxRiskScoreBps", v)}
          disabled={isGuest}
          error={errors.maxRiskScoreBps}
        />
      </section>

      <AdvancedAccordion>
        <TimeRangeField
          label="거래 가능 시간대"
          description="설정한 시간대(UTC) 밖에서는 거래가 실행되지 않습니다. 00:00~00:00은 시간 제한 없음을 뜻합니다."
          startValue={form.tradingStartTime}
          endValue={form.tradingEndTime}
          onChangeStart={(v) => update("tradingStartTime", v)}
          onChangeEnd={(v) => update("tradingEndTime", v)}
          disabled={isGuest}
          startError={errors.tradingStartTime}
          endError={errors.tradingEndTime}
        />
        <BpsField
          label="최대 가격 편차"
          description="시그널 발생 가격과 실제 체결가의 차이가 이 값을 넘으면 거래가 거부됩니다."
          value={form.maxPriceDeviationBps}
          onChange={(v) => update("maxPriceDeviationBps", v)}
          disabled={isGuest}
          error={errors.maxPriceDeviationBps}
        />
        <MsField
          label="시그널 최대 지연"
          description="시그널이 발생한 뒤 이 시간이 지나면 오래된 시그널로 간주해 거부됩니다."
          value={form.maxSignalDelayMs}
          onChange={(v) => update("maxSignalDelayMs", v)}
          secondaryLabel={msToSecondsLabel}
          disabled={isGuest}
          error={errors.maxSignalDelayMs}
        />
        <MsField
          label="Kill Switch 감시 창"
          description="이 시간 창 안에서 발생한 손실을 합산해 Kill Switch 여부를 판단합니다."
          value={form.lossWindowMs}
          onChange={(v) => update("lossWindowMs", v)}
          secondaryLabel={msToMinutesLabel}
          disabled={isGuest}
          error={errors.lossWindowMs}
        />
        <AmountField
          label="창 최대 손실"
          description="감시 창 안에서 손실이 이 금액을 넘으면 Kill Switch가 발동합니다."
          value={form.maxWindowLossAmount}
          onChange={(v) => update("maxWindowLossAmount", v)}
          disabled={isGuest}
          error={errors.maxWindowLossAmount}
        />
      </AdvancedAccordion>

      {!isGuest && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 px-4 text-[13px] font-semibold text-[#B9B0A5] transition-colors duration-200 hover:text-[#FFF8ED] disabled:cursor-not-allowed disabled:opacity-50"
          >
            기본값으로 재설정
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || hasErrors || saving}
            className="flex min-h-[44px] items-center justify-center rounded-xl bg-[#FF5A1F] px-5 text-[13px] font-semibold text-[#11100F] transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      )}

      <SaveToast message={toast?.message ?? null} tone={toast?.tone} />
    </div>
  );
}
