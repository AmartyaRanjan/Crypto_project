"use client";

import { useState } from "react";
import { BarChart3, Loader2, AlertCircle, Cpu, Radio, ShieldCheck, Activity } from "lucide-react";
import { AudioUploader } from "@/components/audio/AudioUploader";
import { WaveformVisualizer } from "@/components/audio/WaveformVisualizer";
import { SpectrogramVisualizer } from "@/components/audio/SpectrogramVisualizer";
import { ClientWavInfo } from "@/lib/audio/wavParser";
import { analyzeAudioApi, AnalyzeSuccessResponse } from "@/lib/api/cryptoWave";

export default function AnalyzePage() {
  const [origFile, setOrigFile] = useState<File | null>(null);
  const [origWavInfo, setOrigWavInfo] = useState<ClientWavInfo | null>(null);

  const [stegoFile, setStegoFile] = useState<File | null>(null);
  const [stegoWavInfo, setStegoWavInfo] = useState<ClientWavInfo | null>(null);

  const [lsbDepth, setLsbDepth] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [analysisData, setAnalysisData] = useState<AnalyzeSuccessResponse | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAnalysisData(null);

    if (!origFile || !stegoFile) {
      setErrorMsg("Please upload both the original carrier WAV and the stego WAV file.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await analyzeAudioApi(origFile, stegoFile, lsbDepth);
      setAnalysisData(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to analyze audio distortion.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6 font-mono">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-100">
            <BarChart3 className="h-5 w-5 text-purple-400" /> Audio Distortion & Steganography Forensic Lab
          </h1>
          <p className="mt-1 font-sans text-xs text-zinc-400">
            Compare original carrier audio against stego audio. Evaluate Signal-to-Noise Ratio (SNR dB), RMS Error, sample modifications, and spectral density.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs">
          <span className="text-zinc-400">METRICS:</span>
          <span className="text-purple-400 font-semibold">SNR & RMS FORENSICS</span>
        </div>
      </div>

      {/* Upload Inputs Grid */}
      <form onSubmit={handleAnalyze} className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AudioUploader
            label="Original Carrier WAV File"
            onFileSelect={(file, info) => {
              setOrigFile(file);
              setOrigWavInfo(info);
            }}
            selectedWavInfo={origWavInfo}
          />
          <AudioUploader
            label="Stego WAV Audio File"
            onFileSelect={(file, info) => {
              setStegoFile(file);
              setStegoWavInfo(info);
            }}
            selectedWavInfo={stegoWavInfo}
          />
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !origFile || !stegoFile}
          className={`w-full flex items-center justify-center gap-2 rounded-md py-3 text-xs font-semibold transition ${
            isLoading || !origFile || !stegoFile
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
              : "bg-purple-500 text-zinc-950 hover:bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>COMPUTING AUDIO METRICS...</span>
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4" />
              <span>ANALYZE AUDIO DISTORTION & METRICS</span>
            </>
          )}
        </button>
      </form>

      {/* Metrics Telemetry Dashboard */}
      {analysisData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-1">
              <div className="text-[11px] text-zinc-400">SIGNAL-TO-NOISE RATIO</div>
              <div className="text-2xl font-bold text-purple-400">{analysisData.metrics.snrDb} dB</div>
              <div className="text-[10px] text-zinc-400">&gt; 80 dB = Imperceptible Noise</div>
            </div>

            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-1">
              <div className="text-[11px] text-zinc-400">RMS DISTORTION ERROR</div>
              <div className="text-2xl font-bold text-cyan-400">{analysisData.metrics.rmsError}</div>
              <div className="text-[10px] text-zinc-400">Root Mean Square sample delta</div>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
              <div className="text-[11px] text-zinc-400">CHANGED SAMPLES</div>
              <div className="text-2xl font-bold text-emerald-400">
                {analysisData.metrics.changedSamples} ({analysisData.metrics.changedSamplesPercent}%)
              </div>
              <div className="text-[10px] text-zinc-400">Total modified Int16 samples</div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-1">
              <div className="text-[11px] text-zinc-400">CHANGED BITS</div>
              <div className="text-2xl font-bold text-zinc-100">{analysisData.metrics.changedBits} Bits</div>
              <div className="text-[10px] text-zinc-400">Total bit flips in LSB positions</div>
            </div>
          </div>

          {/* Visualizations Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {origWavInfo?.samples && (
              <WaveformVisualizer
                samples={origWavInfo.samples}
                sampleRate={origWavInfo.sampleRate}
                compareSamples={stegoWavInfo?.samples}
                title="Carrier vs Stego Waveform Overlay (Emerald=Original, Cyan=Stego)"
              />
            )}

            {stegoWavInfo?.samples && (
              <SpectrogramVisualizer
                samples={stegoWavInfo.samples}
                sampleRate={stegoWavInfo.sampleRate}
                title="Stego Audio Spectral Density (STFT)"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
