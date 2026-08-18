import { RiskPolicySettings } from "@/components/vault/settings/RiskPolicySettings";

export default function VaultSettingsPage() {
  return (
    <main className="mx-auto max-w-[720px] px-5 py-16 lg:px-6">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#B9B0A5]">
        리스크 설정
      </div>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#FFF8ED]">
        실행 정책 설정
      </h1>
      <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[#B9B0A5]">
        거래 한도, 손실 한도 등 Agent가 지킬 리스크 정책을 조정합니다.
      </p>

      <div className="mt-8">
        <RiskPolicySettings />
      </div>
    </main>
  );
}
