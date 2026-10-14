import Link from "next/link";
import { Lock, Unlock, BarChart3, Flame, ArrowRight, ShieldCheck, Cpu, Key, FileAudio, Radio, Database } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-10 font-mono">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 p-8 sm:p-10">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>CRYPTOWAVE v1.0 • TECHNICAL SECURITY LABORATORY</span>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            Password-Protected <span className="text-emerald-400">Audio Steganography</span> & Encryption Console
          </h1>
          
          <p className="font-sans text-sm text-zinc-400 leading-relaxed">
            Encrypt plaintext messages with AES-256-GCM authenticated encryption and scrypt password key derivation, then conceal the binary protocol packet into 16-bit PCM WAV audio samples using 1-bit / 2-bit LSB steganography.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/encode"
              className="flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              <Lock className="h-4 w-4" /> OPEN ENCODE WORKSPACE <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/decode"
              className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              <Unlock className="h-4 w-4 text-emerald-400" /> DECODE STEGO AUDIO
            </Link>
          </div>
        </div>
      </section>

      {/* Conceptual System Pipeline Diagram */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Cpu className="h-4 w-4 text-cyan-400" /> CRYPTOWAVE DATA PIPELINE FLOW
          </h2>
          <span className="text-[11px] text-zinc-400">STATELESS BACKEND ARCHITECTURE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          {/* Step 1: Plaintext */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>01. INPUT</span>
              <span className="text-emerald-400 font-semibold">PLAIN TEXT</span>
            </div>
            <div className="font-sans font-semibold text-zinc-200">Secret Payload</div>
            <p className="text-[11px] text-zinc-400">User UTF-8 message + Secret Password</p>
          </div>

          {/* Step 2: KDF & Encryption */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>02. CRYPTO</span>
              <span className="text-cyan-400 font-semibold">scrypt + AES</span>
            </div>
            <div className="font-sans font-semibold text-zinc-200">AES-256-GCM</div>
            <p className="text-[11px] text-zinc-400">16B Salt, 12B Nonce, 16B Tag, AAD metadata</p>
          </div>

          {/* Step 3: Binary Packet */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>03. PROTOCOL</span>
              <span className="text-emerald-400 font-semibold">CWAV PACKET</span>
            </div>
            <div className="font-sans font-semibold text-zinc-200">Binary Header</div>
            <p className="text-[11px] text-zinc-400">32B Header ('CWAV' magic, version, lengths)</p>
          </div>

          {/* Step 4: LSB Embed */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>04. STEGO</span>
              <span className="text-cyan-400 font-semibold">1-BIT LSB</span>
            </div>
            <div className="font-sans font-semibold text-zinc-200">PCM-16 Embedding</div>
            <p className="text-[11px] text-zinc-400">Replaces bit 0 of Int16 audio samples</p>
          </div>

          {/* Step 5: Output WAV */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-emerald-400">
              <span>05. OUTPUT</span>
              <span className="font-semibold">STEGO WAV</span>
            </div>
            <div className="font-sans font-semibold text-zinc-100">Playable WAV File</div>
            <p className="text-[11px] text-zinc-400">Perceptually transparent (SNR &gt; 100 dB)</p>
          </div>
        </div>
      </section>

      {/* Primary Workspaces Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/encode"
          className="group rounded-lg border border-zinc-800 bg-zinc-900/90 p-5 transition hover:border-emerald-500/50 hover:bg-zinc-900"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-zinc-100 group-hover:text-emerald-400">Encode Workspace</h3>
          <p className="mt-1 font-sans text-xs text-zinc-400">
            Encrypt message and embed into carrier WAV file with real-time capacity calculation.
          </p>
        </Link>

        <Link
          href="/decode"
          className="group rounded-lg border border-zinc-800 bg-zinc-900/90 p-5 transition hover:border-cyan-500/50 hover:bg-zinc-900"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
            <Unlock className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-zinc-100 group-hover:text-cyan-400">Decode Workspace</h3>
          <p className="mt-1 font-sans text-xs text-zinc-400">
            Extract CWAV binary packet from stego WAV and authenticate AES-GCM decryption.
          </p>
        </Link>

        <Link
          href="/analyze"
          className="group rounded-lg border border-zinc-800 bg-zinc-900/90 p-5 transition hover:border-purple-500/50 hover:bg-zinc-900"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-zinc-100 group-hover:text-purple-400">Audio Distortion Lab</h3>
          <p className="mt-1 font-sans text-xs text-zinc-400">
            Compare waveforms, spectrograms, RMS error, and SNR dB metrics between WAV files.
          </p>
        </Link>

        <Link
          href="/attack-lab"
          className="group rounded-lg border border-zinc-800 bg-zinc-900/90 p-5 transition hover:border-rose-500/50 hover:bg-zinc-900"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 group-hover:scale-105 transition-transform">
            <Flame className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-zinc-100 group-hover:text-rose-400">Attack Lab</h3>
          <p className="mt-1 font-sans text-xs text-zinc-400">
            Test password attacks, bit flipping sample tampering, and volume gain scaling.
          </p>
        </Link>
      </section>

      {/* Technical Capabilities Matrix */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> CRYPTOGRAPHIC & AUDIO SPECIFICATIONS
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <div className="text-[11px] text-zinc-400">CIPHER</div>
            <div className="font-semibold text-emerald-400">AES-256-GCM</div>
            <div className="text-[11px] text-zinc-400">96-bit Nonce, 128-bit Tag</div>
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-zinc-400">KDF</div>
            <div className="font-semibold text-emerald-400">scrypt KDF</div>
            <div className="text-[11px] text-zinc-400">16B Salt, N=32768, r=8, p=1</div>
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-zinc-400">AUDIO FORMAT</div>
            <div className="font-semibold text-cyan-400">PCM-16 WAV</div>
            <div className="text-[11px] text-zinc-400">Mono & Stereo 16-bit Int</div>
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-zinc-400">PROTOCOL</div>
            <div className="font-semibold text-cyan-400">CWAV Packet v1</div>
            <div className="text-[11px] text-zinc-400">Magic header + AAD metadata</div>
          </div>
        </div>
      </section>
    </div>
  );
}
