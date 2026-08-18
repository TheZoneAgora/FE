"use client";

/**
 * 온보딩 3단계 "지갑 연결" / 상세 시트 "맡기기" 흐름에서 쓰는 지갑 연결 컨텍스트.
 * 헤더의 ConnectButton과 달리, 임의의 버튼에서 프로그래매틱하게 연결 모달을 띄우고
 * 연결 완료 후 콜백(위임 실행 등)을 이어갈 수 있어야 해서 dApp Kit의 ConnectModal을
 * 직접 제어(open/onOpenChange)한다.
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ConnectModal, useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";

interface WalletConnectContextValue {
  connected: boolean;
  address: string | null;
  requestConnect: (onConnected?: () => void) => void;
  disconnect: () => void;
}

const WalletConnectContext = createContext<WalletConnectContextValue | null>(null);

export function WalletConnectProvider({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const { mutate: disconnectMutate } = useDisconnectWallet();
  const [open, setOpen] = useState(false);
  const pendingCb = useRef<(() => void) | null>(null);
  const wasConnected = useRef(false);

  useEffect(() => {
    const isConnected = !!account;
    if (isConnected && !wasConnected.current && pendingCb.current) {
      const cb = pendingCb.current;
      pendingCb.current = null;
      const t = setTimeout(cb, 300);
      wasConnected.current = isConnected;
      return () => clearTimeout(t);
    }
    wasConnected.current = isConnected;
  }, [account]);

  function requestConnect(onConnected?: () => void) {
    if (account) {
      onConnected?.();
      return;
    }
    pendingCb.current = onConnected ?? null;
    setOpen(true);
  }

  function disconnect() {
    pendingCb.current = null;
    disconnectMutate();
  }

  return (
    <WalletConnectContext.Provider
      value={{
        connected: !!account,
        address: account?.address ?? null,
        requestConnect,
        disconnect,
      }}
    >
      {children}
      <ConnectModal trigger={<span style={{ display: "none" }} />} open={open} onOpenChange={setOpen} />
    </WalletConnectContext.Provider>
  );
}

export function useWalletConnect(): WalletConnectContextValue {
  const ctx = useContext(WalletConnectContext);
  if (!ctx) throw new Error("useWalletConnect must be used within WalletConnectProvider");
  return ctx;
}
