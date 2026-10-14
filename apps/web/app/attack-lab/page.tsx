"use client";

import { useState } from "react";
import { Flame, ShieldAlert, CheckCircle2, AlertTriangle, Play, RefreshCw, Lock, Unlock, Volume2 } from "lucide-react";
import { parseClientWav } from "@/lib/audio/wavParser";
import { encodeAudioApi, decodeAudioApi } from "@/lib/api/cryptoWave";

interface ExperimentResult {
  attackName: string;
  expectedResult: string;
  actualResult: string;
  passed: boolean;
  explanation: string;
}

export default function AttackLabPage() {
  const [activeExperiment, setActiveExperiment] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ExperimentResult>>({});

  // Generate in-memory 1-second WAV for testing
  const createSampleWavFile = (): File => {
    const sampleRate = 44100;
    const duration = 1;
    const samples = new Int16Array(sampleRate * duration);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.round(15000 * Math.sin((2 * Math.PI * 440 * i) / sampleRate));
    }
    const dataSize = samples.length * 2;
    const buf = new Uint8Array(44 + dataSize);
    const view = new DataView(buf.buffer);

    buf.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    view.setUint32(4, 36 + dataSize, true);
    buf.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
    buf.set([0x66, 0x6d, 0x74, 0x20], 12); // fmt 
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    buf.set([0x64, 0x61, 0x74, 0x61], 36); // data
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset, samples[i], true);
      offset += 2;
    }

    return new File([buf], "attack_carrier.wav", { type: "audio/wav" });
  };

  // Run Wrong Password Attack
  const runWrongPasswordAttack = async () => {
    setActiveExperiment("wrong-password");
    try {
      const file = createSampleWavFile();
      const encodeRes = await encodeAudioApi(file, "Attack test message", "CorrectPassword123", 1);
      const stegoFile = new File([encodeRes.blob], "stego.wav", { type: "audio/wav" });

      // Attempt decode with wrong password
      await decodeAudioApi(stegoFile, "WRONG_PASSWORD_999", 1);

      setResults((prev) => ({
        ...prev,
        "wrong-password": {
          attackName: "Wrong Password Attack",
          expectedResult: "AES-256-GCM Authentication Failure",
          actualResult: "UNEXPECTED SUCCESS: Decrypted with wrong password!",
          passed: false,
          explanation: "Wrong password failed to trigger authentication rejection.",
        },
      }));
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        "wrong-password": {
          attackName: "Wrong Password Attack",
          expectedResult: "AES-256-GCM Authentication Failure",
          actualResult: `SUCCESSFUL REJECTION: ${err.message}`,
          passed: true,
          explanation:
            "Deriving key with wrong password produces incorrect AES key. AES-256-GCM authentication tag verification fails immediately, preventing garbage plaintext recovery.",
        },
      }));
    } finally {
      setActiveExperiment(null);
    }
  };

  // Run Sample Bit Flipping Attack
  const runSampleTamperAttack = async () => {
    setActiveExperiment("sample-tamper");
    try {
      const file = createSampleWavFile();
      const encodeRes = await encodeAudioApi(file, "Tamper test payload", "Password123", 1);

      // Corrupt byte in audio buffer
      const buf = new Uint8Array(await encodeRes.blob.arrayBuffer());
      buf[200] ^= 0xff; // Flip bits in sample data

      const tamperedFile = new File([buf], "tampered_stego.wav", { type: "audio/wav" });
      await decodeAudioApi(tamperedFile, "Password123", 1);

      setResults((prev) => ({
        ...prev,
        "sample-tamper": {
          attackName: "Sample Bit-Flipping Tampering",
          expectedResult: "Tamper Rejection / Auth Tag Failure",
          actualResult: "UNEXPECTED DECRYPTION: Corrupted payload was accepted!",
          passed: false,
          explanation: "Tampered samples were not caught by cryptographic checks.",
        },
      }));
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        "sample-tamper": {
          attackName: "Sample Bit-Flipping Tampering",
          expectedResult: "Tamper Rejection / Auth Tag Failure",
          actualResult: `SUCCESSFUL REJECTION: ${err.message}`,
          passed: true,
          explanation:
            "Modifying Int16 PCM samples alters embedded LSB bits. AES-256-GCM authentication tag or CWAV header validation detects ciphertext alteration and aborts decryption.",
        },
      }));
    } finally {
      setActiveExperiment(null);
    }
  };

  // Run Volume Amplification Attack
  const runVolumeScalingAttack = async () => {
    setActiveExperiment("volume-scale");
    try {
      const file = createSampleWavFile();
      const encodeRes = await encodeAudioApi(file, "Volume test message", "Password123", 1);

      const buf = new Uint8Array(await encodeRes.blob.arrayBuffer());
      const view = new DataView(buf.buffer);

      // Multiply PCM samples by 2x gain
      for (let i = 44; i < buf.length; i += 2) {
        const val = view.getInt16(i, true);
        const scaled = Math.min(32767, Math.max(-32768, val * 2));
        view.setInt16(i, scaled, true);
      }

      const scaledFile = new File([buf], "scaled_stego.wav", { type: "audio/wav" });
      await decodeAudioApi(scaledFile, "Password123", 1);

      setResults((prev) => ({
        ...prev,
        "volume-scale": {
          attackName: "Amplitude Gain Scaling (2x Volume)",
          expectedResult: "LSB Extraction Failure (Fragility Demonstrated)",
          actualResult: "UNEXPECTED RECOVERY: LSB bits survived gain scaling.",
          passed: false,
          explanation: "LSB steganography surprisingly survived amplitude scaling.",
        },
      }));
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        "volume-scale": {
          attackName: "Amplitude Gain Scaling (2x Volume)",
          expectedResult: "LSB Extraction Failure (Fragility Demonstrated)",
          actualResult: `EXPECTED EXTRACTION FAILURE: ${err.message}`,
          passed: true,
          explanation:
            "LSB steganography is fragile against amplitude scaling or volume changes. Doubling sample values shifts all bit positions, destroying bit 0 payload alignment.",
        },
      }));
    } finally {
      setActiveExperiment(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6 font-mono">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-100">
            <Flame className="h-5 w-5 text-rose-400" /> Attack & Robustness Experimentation Lab
          </h1>
          <p className="mt-1 font-sans text-xs text-zinc-400">
            Execute controlled security experiments to demonstrate the difference between cryptographic confidentiality/integrity and steganographic fragility.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs">
          <span className="text-zinc-400">LAB STATUS:</span>
          <span className="text-rose-400 font-semibold">ATTACK MATRIX ACTIVE</span>
        </div>
      </div>

      {/* Experiment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Experiment 1: Wrong Password */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-400">
              <span className="flex items-center gap-1.5"><Lock className="h-4 w-4" /> ATTACK 01</span>
              <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px]">CRYPTOGRAPHIC</span>
            </div>
            <h3 className="font-semibold text-zinc-100">Wrong Password Attack</h3>
            <p className="font-sans text-xs text-zinc-400 leading-relaxed">
              Attempts to decode stego audio using an incorrect password. Tests scrypt key derivation and AES-256-GCM authentication tag rejection.
            </p>
          </div>

          <button
            onClick={runWrongPasswordAttack}
            disabled={activeExperiment !== null}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
          >
            {activeExperiment === "wrong-password" ? "TESTING..." : "EXECUTE ATTACK"}
          </button>
        </div>

        {/* Experiment 2: Sample Tampering */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
              <span className="flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> ATTACK 02</span>
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px]">INTEGRITY</span>
            </div>
            <h3 className="font-semibold text-zinc-100">Sample Bit Flipping</h3>
            <p className="font-sans text-xs text-zinc-400 leading-relaxed">
              Corrupts PCM audio samples in the payload area. Verifies CWAV header validation and AES-GCM payload tampering rejection.
            </p>
          </div>

          <button
            onClick={runSampleTamperAttack}
            disabled={activeExperiment !== null}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
          >
            {activeExperiment === "sample-tamper" ? "TESTING..." : "EXECUTE TAMPER"}
          </button>
        </div>

        {/* Experiment 3: Volume Gain Scaling */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-cyan-400">
              <span className="flex items-center gap-1.5"><Volume2 className="h-4 w-4" /> ATTACK 03</span>
              <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px]">STEGANOGRAPHIC</span>
            </div>
            <h3 className="font-semibold text-zinc-100">Amplitude Gain Scaling</h3>
            <p className="font-sans text-xs text-zinc-400 leading-relaxed">
              Applies 2x volume gain amplification to audio samples. Demonstrates that 1-bit LSB steganography is fragile under amplitude transforms.
            </p>
          </div>

          <button
            onClick={runVolumeScalingAttack}
            disabled={activeExperiment !== null}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-cyan-500/10 border border-cyan-500/30 px-3 py-2 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {activeExperiment === "volume-scale" ? "TESTING..." : "EXECUTE SCALING"}
          </button>
        </div>
      </div>

      {/* Results Output Section */}
      {Object.keys(results).length > 0 && (
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">EXPERIMENTAL RESULTS LOG</h2>

          <div className="space-y-4">
            {Object.values(results).map((res, i) => (
              <div
                key={i}
                className={`rounded-lg border p-5 space-y-3 font-mono text-xs ${
                  res.passed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-rose-500/30 bg-rose-500/5"
                }`}
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2 font-bold text-zinc-100">
                    {res.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                    )}
                    <span>{res.attackName}</span>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                      res.passed ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {res.passed ? "PASSED EXPECTED BEHAVIOR" : "FAILED EXPECTED BEHAVIOR"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-400">Expected Result:</span>
                    <div className="font-semibold text-zinc-200">{res.expectedResult}</div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Actual Result:</span>
                    <div className={res.passed ? "font-semibold text-emerald-400" : "font-semibold text-rose-400"}>
                      {res.actualResult}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 font-sans text-xs text-zinc-300 leading-relaxed">
                  <span className="font-mono font-semibold text-cyan-400">TECHNICAL EXPLANATION: </span>
                  {res.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
