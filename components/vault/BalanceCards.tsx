import type { VaultState } from "@/lib/vault/types";
import { formatSui, formatUsdc } from "@/components/vault/format";

export function BalanceCards({ vault }: { vault: VaultState }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BalanceCard label="USDC 잔액" value={formatUsdc(vault.fiatBalance)} suffix="USDC" />
      <BalanceCard label="SUI 잔액" value={formatSui(vault.cryptoBalance)} suffix="SUI" />
    </div>
  );
}

function BalanceCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-dark px-5 py-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-light">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="tabular-nums font-display text-[26px] font-bold text-warm-ivory">
          {value}
        </span>
        <span className="text-[13px] font-medium text-muted-light">{suffix}</span>
      </div>
    </div>
  );
}
