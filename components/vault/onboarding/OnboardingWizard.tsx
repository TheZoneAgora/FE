"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/lib/vault/useVault";
import { StepIndicator } from "./StepIndicator";
import { ConnectStep } from "./ConnectStep";
import { DepositStep } from "./DepositStep";
import { ConfirmStep } from "./ConfirmStep";
import { CompleteScreen } from "./CompleteScreen";
import { parseUsdcInput } from "./onboardingFormat";

const MIN_DEPOSIT_USDC = 10;
const MIN_DEPOSIT_BASE_UNITS = BigInt(MIN_DEPOSIT_USDC) * 1_000_000n;
const REDIRECT_DELAY_MS = 1200;

type Step = 1 | 2 | 3;

export function OnboardingWizard() {
  const router = useRouter();
  const { owner, hasVault, loading, actions } = useVault();

  const [step, setStep] = useState<Step>(1);
  const [depositInput, setDepositInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  // 이미 볼트가 있는 지갑은 온보딩을 건너뛴다. 지갑이 연결되면 자동으로 예치 단계로 이동한다.
  useEffect(() => {
    if (loading || completed) return;
    if (owner && hasVault) {
      router.replace("/vault");
      return;
    }
    if (owner && step === 1) {
      setStep(2);
    }
    if (!owner && step !== 1) {
      setStep(1);
    }
  }, [owner, hasVault, loading, completed, step, router]);

  useEffect(() => {
    if (!completed) return;
    const timer = setTimeout(() => router.push("/vault"), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [completed, router]);

  const depositAmount = parseUsdcInput(depositInput);
  const depositValid =
    depositAmount !== null && depositAmount >= MIN_DEPOSIT_BASE_UNITS;

  const handleCreateVault = async () => {
    if (!depositAmount) return;
    setSubmitting(true);
    setError(null);
    try {
      await actions.createVault({ depositAmount });
      setCompleted(true);
    } catch {
      setError("볼트 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-arena-black px-5 py-12 lg:px-6">
        <div className="w-full max-w-[480px]">
          <CompleteScreen />
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-arena-black px-5 py-12 lg:px-6">
        <p className="text-[14px] text-muted-light">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-arena-black px-5 py-16 lg:px-6">
      <div className="mx-auto max-w-[480px]">
        <StepIndicator step={step} />

        {step === 1 && <ConnectStep />}

        {step === 2 && (
          <DepositStep
            value={depositInput}
            onChange={setDepositInput}
            minUsdc={MIN_DEPOSIT_USDC}
            valid={depositValid}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && depositAmount !== null && (
          <ConfirmStep
            depositAmount={depositAmount}
            submitting={submitting}
            error={error}
            onBack={() => setStep(2)}
            onConfirm={handleCreateVault}
          />
        )}
      </div>
    </main>
  );
}
