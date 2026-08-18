"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { WalletConnectProvider } from "@/components/arena/WalletConnect";

const networks = {
  testnet: { url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" as const },
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
