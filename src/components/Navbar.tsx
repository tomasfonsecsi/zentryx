"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Bridge", href: "/bridge" },
  { label: "Faucet", href: "/faucet" },
  { label: "Profile", href: "/profile" },
];

export function Navbar() {
  const pathname = usePathname();
  const activePath = pathname === "/" ? "/bridge" : pathname;

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-[28px]"
      style={{
        background: "linear-gradient(180deg, rgba(5,8,16,0.96) 0%, rgba(3,6,14,0.92) 100%)",
        borderBottom: "1px solid rgba(59,158,255,0.06)",
        boxShadow: "0 1px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(59,158,255,0.03)",
      }}
    >
      <div className="max-w-[1240px] mx-auto px-6 h-[54px] flex items-center">
        <Link href="/bridge" className="flex items-center gap-[10px] shrink-0 mr-10 group">
          <div className="w-[26px] h-[26px] shrink-0">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 8L10 12L4 16" stroke="#3b9eff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 8L14 12L20 16" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="10" y1="12" x2="14" y2="12" stroke="#3b9eff" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span
            className="text-[17px] leading-none transition-opacity duration-200 group-hover:opacity-100 opacity-[0.88]"
            style={{
              fontFamily: "'Satoshi', 'Inter', system-ui, sans-serif",
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: "#d0d8e8",
            }}
          >
            Zentryx
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-[3px]">
          {TABS.map((tab) => (
            <Link key={tab.href} href={tab.href}
              className={cn("px-[14px] py-[5px] text-[13px] font-medium rounded-[8px] transition-all duration-150", activePath === tab.href ? "z-tab-active" : "z-tab")}>
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center">
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
        </div>
      </div>

      <nav className="sm:hidden flex items-center gap-[3px] px-4 pb-2.5">
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href}
            className={cn("flex-1 text-center py-[6px] text-[12px] font-medium rounded-[8px] transition-all duration-150", activePath === tab.href ? "z-tab-active" : "z-tab")}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
