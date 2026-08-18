"use client";

/**
 * 온보딩 3단계 "지갑 연결" / 상세 시트 "맡기기" 흐름에서 쓰는 지갑 연결 컨텍스트.
 * design/agora-arena.html의 지갑 모달(.modal/.w-opt/.w-skip)을 그대로 포팅한다 —
 * 실제 감지된 Sui 지갑 목록 + 맨 아래 "데모로 둘러보기" 스킵.
 * 스킵을 고르면 지갑 연결 없이 콜백을 그대로 이어간다(게스트/데모 모드).
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  useConnectWallet,
  useCurrentAccount,
  useDisconnectWallet,
  useWallets,
} from "@mysten/dapp-kit";

interface WalletConnectContextValue {
  connected: boolean;
  address: string | null;
  /** 지갑 연결 또는 "데모로 둘러보기" 스킵 후 onDone(connected)을 호출한다. */
  requestConnect: (onDone?: (connected: boolean) => void) => void;
  disconnect: () => void;
}

const WalletConnectContext = createContext<WalletConnectContextValue | null>(null);

export function WalletConnectProvider({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connectMutate } = useConnectWallet();
  const { mutate: disconnectMutate } = useDisconnectWallet();
  const [open, setOpen] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const pendingCb = useRef<((connected: boolean) => void) | null>(null);
  const wasConnected = useRef(false);

  useEffect(() => {
    const isConnected = !!account;
    if (isConnected && !wasConnected.current && pendingCb.current) {
      const cb = pendingCb.current;
      pendingCb.current = null;
      setOpen(false);
      const t = setTimeout(() => cb(true), 300);
      wasConnected.current = isConnected;
      return () => clearTimeout(t);
    }
    wasConnected.current = isConnected;
  }, [account]);

  function requestConnect(onDone?: (connected: boolean) => void) {
    if (account) {
      onDone?.(true);
      return;
    }
    pendingCb.current = onDone ?? null;
    setOpen(true);
  }

  function handlePick(walletName: string) {
    const wallet = wallets.find((w) => w.name === walletName);
    if (!wallet) return;
    setConnectingId(walletName);
    connectMutate(
      { wallet },
      {
        onSettled: () => setConnectingId(null),
        // account effect가 성공 시 콜백을 이어가므로 여기선 실패만 처리한다.
        onError: () => setConnectingId(null),
      }
    );
  }

  function handleSkip() {
    setOpen(false);
    setConnectingId(null);
    const cb = pendingCb.current;
    pendingCb.current = null;
    if (cb) setTimeout(() => cb(false), 150);
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
      <div className={`overlay${open ? " on" : ""}`} onClick={handleSkip} />
      <div className={`modal${open ? " on" : ""}`} role="dialog" aria-modal="true">
        <h3>지갑 연결</h3>
        <p className="sub">
          Sui 지갑으로 30초면 끝나요. 지갑이 없어도 데모로 전부 둘러볼 수 있습니다.
        </p>
        {wallets.length === 0 && (
          <p className="sub" style={{ marginTop: -10 }}>
            브라우저에서 감지된 Sui 지갑이 없습니다 — 확장 프로그램을 설치하거나 데모로
            둘러보세요.
          </p>
        )}
        {wallets.map((wallet) => (
          <button
            key={wallet.name}
            type="button"
            className="w-opt"
            disabled={connectingId !== null}
            onClick={() => handlePick(wallet.name)}
          >
            {wallet.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={wallet.icon} alt="" className="wi" style={{ objectFit: "contain" }} />
            ) : (
              <span className="wi" style={{ background: "#FF5A1F22" }}>
                🌊
              </span>
            )}
            {connectingId === wallet.name ? "연결 중…" : wallet.name}
          </button>
        ))}
        <button type="button" className="w-skip" onClick={handleSkip}>
          데모로 둘러보기 →
        </button>
      </div>
    </WalletConnectContext.Provider>
  );
}

export function useWalletConnect(): WalletConnectContextValue {
  const ctx = useContext(WalletConnectContext);
  if (!ctx) throw new Error("useWalletConnect must be used within WalletConnectProvider");
  return ctx;
}
