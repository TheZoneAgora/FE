"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { WalletConnectProvider } from "@/components/arena/WalletConnect";
import { TESTNET_RPC_URL } from "@/lib/config/env";

// Sui Foundation 공식 testnet 풀노드는 JSON-RPC를 껐다(2026-07말~) — dapp-kit이
// 아직 gRPC를 지원 안 해서 여전히 JSON-RPC를 서빙하는 서드파티 퍼블릭 노드로 우회.
// 자세한 내용은 lib/config/env.ts의 TESTNET_RPC_URL 주석 참고.
const networks = {
  testnet: { url: TESTNET_RPC_URL, network: "testnet" as const },
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          {/* 헤더/온보딩/위임 등 앱 전체가 같은 커스텀 지갑 모달(스킵 옵션 포함)을 쓴다. */}
          <WalletConnectProvider>{children}</WalletConnectProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
