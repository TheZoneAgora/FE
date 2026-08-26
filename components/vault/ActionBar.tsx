"use client";

import { useState } from "react";
import type { VaultState } from "@/lib/vault/types";
import type { UseVaultResult } from "@/lib/vault/useVault";
import { DepositModal } from "@/components/vault/DepositModal";
import { WithdrawModal } from "@/components/vault/WithdrawModal";
import { EmergencyExitModal } from "@/components/vault/EmergencyExitModal";

type Actions = UseVaultResult["actions"];
type ModalKind = "deposit" | "withdraw" | "emergency" | null;

export function ActionBar({ vault, actions }: { vault: VaultState; actions: Actions }) {
  const [modal, setModal] = useState<ModalKind>(null);
  const [pausePending, setPausePending] = useState(false);
  const paused = vault.agentStatus === "PAUSED";

  async function togglePause() {
    setPausePending(true);
    try {
      if (paused) await actions.reactivateAgent();
      else await actions.revokeAgent();
    } finally {
      setPausePending(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <ActionButton label="입금" onClick={() => setModal("deposit")} variant="secondary" />
        <ActionButton label="출금" onClick={() => setModal("withdraw")} variant="secondary" />
        <ActionButton
          label={paused ? "재개" : "일시정지"}
          onClick={togglePause}
          variant="secondary"
          disabled={pausePending}
        />
        <ActionButton label="긴급탈출" onClick={() => setModal("emergency")} variant="destructive" />
      </div>

      <DepositModal
        open={modal === "deposit"}
        onClose={() => setModal(null)}
        onSubmit={actions.depositMore}
      />
      <WithdrawModal
        open={modal === "withdraw"}
        onClose={() => setModal(null)}
        fiatBalance={vault.fiatBalance}
        cryptoBalance={vault.cryptoBalance}
        onSubmitAmount={actions.withdrawAmount}
        onSubmitCrypto={actions.withdrawCrypto}
        onSubmitAll={actions.withdrawAll}
      />
      <EmergencyExitModal
        open={modal === "emergency"}
        onClose={() => setModal(null)}
        vault={vault}
        onLiquidateAll={actions.emergencyLiquidateAll}
        onPauseAndWithdraw={actions.emergencyPauseAndWithdraw}
      />
    </>
  );
}

function ActionButton({
  label,
  onClick,
  variant,
  disabled,
}: {
  label: string;
  onClick: () => void;
  variant: "secondary" | "destructive";
  disabled?: boolean;
}) {
  const base =
    "flex min-h-[44px] items-center justify-center rounded-xl px-4 text-[13px] font-semibold transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
  const variantClass =
    variant === "destructive"
      ? "border border-negative/50 bg-negative/10 text-negative hover:bg-negative/20"
      : "border border-white/15 bg-white/[0.03] text-warm-ivory hover:bg-white/[0.08]";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${variantClass}`}>
      {label}
    </button>
  );
}
