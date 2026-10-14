"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Radio, Lock, Unlock, BarChart3, Flame, BookOpen, Activity } from "lucide-react";
import { checkBackendHealth } from "@/lib/api/cryptoWave";

export function Navbar() {
  const pathname = usePathname();
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkBackendHealth().then((res) => {
      setIsBackendOnline(res !== null && res.status === "ok");
    });
  }, []);

  const navItems = [
    { href: "/", label: "Overview", icon: ShieldCheck },
    { href: "/encode", label: "Encode", icon: Lock },
    { href: "/decode", label: "Decode", icon: Unlock },
    { href: "/analyze", label: "Analyze", icon: BarChart3 },
    { href: "/attack-lab", label: "Attack Lab", icon: Flame },
    { href: "/docs", label: "Docs", icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-zinc-100 transition hover:opacity-90">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <span className="font-mono text-base tracking-wider text-zinc-100">
            CRYPTO<span className="text-emerald-400">WAVE</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  isActive
                    ? "bg-zinc-800 text-emerald-400 border border-zinc-700/60"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* System Telemetry Pill Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 text-[11px] font-mono text-zinc-300">
            <Activity className="h-3 w-3 text-cyan-400" />
            <span className="text-zinc-400">PROTOCOL:</span>
            <span className="text-zinc-200 font-semibold">CWAV v1</span>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-mono">
            <span
              className={`h-2 w-2 rounded-full ${
                isBackendOnline === true
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                  : isBackendOnline === false
                  ? "bg-rose-500"
                  : "bg-amber-400 animate-ping"
              }`}
            />
            <span className="text-zinc-400">API:</span>
            <span
              className={
                isBackendOnline === true
                  ? "text-emerald-400 font-medium"
                  : isBackendOnline === false
                  ? "text-rose-400 font-medium"
                  : "text-amber-400"
              }
            >
              {isBackendOnline === true ? "ONLINE" : isBackendOnline === false ? "OFFLINE" : "PINGING..."}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Row */}
      <div className="flex md:hidden overflow-x-auto border-t border-zinc-900 px-3 py-1.5 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs whitespace-nowrap font-medium transition ${
                isActive ? "bg-zinc-800 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-3 w-3" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
