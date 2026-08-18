"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@mysten/dapp-kit";

const TABS = [
  { href: "/", label: "더비" },
  { href: "/vault", label: "내 볼트" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#11100F]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-5 lg:px-6">
        {/* Wordmark — design.md §5.2 */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-[#B9B0A5]">
            THE ZONE
          </span>
          <span className="font-display text-[15px] font-bold uppercase tracking-[-0.02em] text-[#FFF8ED]">
            AGORA
          </span>
        </Link>

        {/* Mode tabs */}
        <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-h-[44px] items-center rounded-full px-4 text-[13px] font-semibold transition-colors duration-200 ${
                  active
                    ? "bg-[#FF5A1F] text-[#11100F]"
                    : "text-[#B9B0A5] hover:text-[#FFF8ED]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Wallet connection */}
        <div className="shrink-0">
          <ConnectButton connectText="지갑 연결" />
        </div>
      </div>
    </header>
  );
}
