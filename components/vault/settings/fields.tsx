"use client";

import type { ReactNode } from "react";
import { bpsToPercentLabel } from "./policyFormUtils";

function FieldShell({
  label,
  unit,
  description,
  error,
  children,
}: {
  label: string;
  unit?: string;
  description: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[13px] font-semibold text-[#FFF8ED]">{label}</label>
        {unit && (
          <span className="text-[11px] uppercase tracking-[0.06em] text-[#8D857B]">
            {unit}
          </span>
        )}
      </div>
      {children}
      <p className="text-[12px] leading-relaxed text-[#B9B0A5]">{description}</p>
      {error && <p className="text-[12px] font-medium text-[#F04F5F]">{error}</p>}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border bg-white/[0.03] px-3 py-2 text-[14px] font-medium text-[#FFF8ED] outline-none transition-colors duration-200 focus:border-[#FF5A1F]/60 disabled:cursor-not-allowed disabled:opacity-60";

function inputBorder(hasError: boolean) {
  return hasError ? "border-[#F04F5F]/60" : "border-white/10";
}

export function AmountField({
  label,
  description,
  value,
  onChange,
  disabled,
  error,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <FieldShell label={label} unit="USDC" description={description} error={error}>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          className={`${inputBase} ${inputBorder(!!error)} pr-14`}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#8D857B]">
          USDC
        </span>
      </div>
    </FieldShell>
  );
}

export function RiskScoreField({
  label,
  description,
  value,
  onChange,
  disabled,
  error,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const numeric = Number(value);
  const sliderValue = Number.isFinite(numeric) ? Math.min(10000, Math.max(0, numeric)) : 0;

  return (
    <FieldShell label={label} unit="bps" description={description} error={error}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={10000}
          step={10}
          value={sliderValue}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-[#FF5A1F] disabled:cursor-not-allowed"
        />
        <input
          type="text"
          inputMode="numeric"
          className={`${inputBase} ${inputBorder(!!error)} w-24 text-right`}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <p className="text-[12px] font-semibold text-[#FF5A1F]">
        {Number.isFinite(numeric) ? bpsToPercentLabel(numeric) : "—"}
      </p>
    </FieldShell>
  );
}

export function BpsField({
  label,
  description,
  value,
  onChange,
  disabled,
  error,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const numeric = Number(value);
  return (
    <FieldShell label={label} unit="bps" description={description} error={error}>
      <input
        type="text"
        inputMode="numeric"
        className={`${inputBase} ${inputBorder(!!error)}`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[12px] text-[#8D857B]">
        {Number.isFinite(numeric) ? bpsToPercentLabel(numeric) : "—"}
      </p>
    </FieldShell>
  );
}

export function MsField({
  label,
  description,
  value,
  onChange,
  secondaryLabel,
  disabled,
  error,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  secondaryLabel: (ms: number) => string;
  disabled?: boolean;
  error?: string;
}) {
  const numeric = Number(value);
  return (
    <FieldShell label={label} unit="ms" description={description} error={error}>
      <input
        type="text"
        inputMode="numeric"
        className={`${inputBase} ${inputBorder(!!error)}`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[12px] text-[#8D857B]">
        {Number.isFinite(numeric) ? secondaryLabel(numeric) : "—"}
      </p>
    </FieldShell>
  );
}

export function TimeRangeField({
  label,
  description,
  startValue,
  endValue,
  onChangeStart,
  onChangeEnd,
  disabled,
  startError,
  endError,
}: {
  label: string;
  description: string;
  startValue: string;
  endValue: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  disabled?: boolean;
  startError?: string;
  endError?: string;
}) {
  return (
    <FieldShell label={label} unit="UTC" description={description}>
      <div className="flex items-center gap-3">
        <input
          type="time"
          className={`${inputBase} ${inputBorder(!!startError)}`}
          value={startValue}
          disabled={disabled}
          onChange={(e) => onChangeStart(e.target.value)}
        />
        <span className="text-[13px] text-[#8D857B]">~</span>
        <input
          type="time"
          className={`${inputBase} ${inputBorder(!!endError)}`}
          value={endValue}
          disabled={disabled}
          onChange={(e) => onChangeEnd(e.target.value)}
        />
      </div>
      {(startError || endError) && (
        <p className="text-[12px] font-medium text-[#F04F5F]">
          {startError ?? endError}
        </p>
      )}
    </FieldShell>
  );
}
