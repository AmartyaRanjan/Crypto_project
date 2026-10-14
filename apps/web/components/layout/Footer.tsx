import { Lock, Radio, Cpu } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-xs text-zinc-400">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2 font-mono">
          <Radio className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-zinc-300 font-semibold">CryptoWave v1.0</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">Password-Protected Audio Steganography</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-emerald-400" /> AES-256-GCM + scrypt
          </span>
          <span className="text-zinc-700">•</span>
          <span className="flex items-center gap-1">
            <Cpu className="h-3 w-3 text-cyan-400" /> PCM-16 WAV 1-Bit LSB
          </span>
          <span className="text-zinc-700">•</span>
          <span>CWAV Protocol Spec</span>
        </div>
      </div>
    </footer>
  );
}
