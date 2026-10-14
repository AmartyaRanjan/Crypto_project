"use client";

import { useState } from "react";
import { Lock, Download, AlertCircle, CheckCircle2, Loader2, Sparkles, Cpu, ShieldAlert } from "lucide-react";
import { AudioUploader } from "@/components/audio/AudioUploader";
import { WaveformVisualizer } from "@/components/audio/WaveformVisualizer";
import { ClientWavInfo } from "@/lib/audio/wavParser";
import { encodeAudioApi, AudioMetricsResponse } from "@/lib/api/cryptoWave";

export default function EncodePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [wavInfo, setWavInfo] = useState<ClientWavInfo | null>(null);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [lsbDepth, setLsbDepth] = useState<1 | 2>(1);

  const [isLoading, setIsLoading] = useState(false);
  const [encodeStage, setEncodeStage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [stegoBlob, setStegoBlob] = useState<Blob | null>(null);
  const [stegoFilename, setStegoFilename] = useState<string>("stego.wav");
  const [metrics, setMetrics] = useState<AudioMetricsResponse | null>(null);

  // Estimate payload & packet byte size client-side
  const payloadBytesEstimate = new TextEncoder().encode(message).length;
  // Packet Header (32) + Salt (16) + Nonce (12) + Tag (16) + Payload + AES padding
  const totalPacketEstimateBytes = 32 + 16 + 12 + 16 + payloadBytesEstimate;
  const capacityBytes = wavInfo ? Math.floor((wavInfo.totalSamples * lsbDepth) / 8) : 0;
  const isCapacityOverflow = totalPacketEstimateBytes > capacityBytes && capacityBytes > 0;

  const handleEncode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStegoBlob(null);
    setMetrics(null);

    if (!selectedFile) {
      setErrorMsg("Please upload a carrier .wav audio file.");
      return;
    }
    if (!message.trim()) {
      setErrorMsg("Please enter a secret message to encrypt.");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter a secret password.");
      return;
    }
    if (isCapacityOverflow) {
      setErrorMsg(`Estimated packet size (${totalPacketEstimateBytes} B) exceeds carrier audio capacity (${capacityBytes} B).`);
      return;
    }

    setIsLoading(true);
    try {
      setEncodeStage("01. Parsing WAV & Generating scrypt Salt...");
      await new Promise((r) => setTimeout(r, 250));

      setEncodeStage("02. Encrypting Payload with AES-256-GCM...");
      await new Promise((r) => setTimeout(r, 250));

      setEncodeStage("03. Constructing CWAV Binary Packet...");
      await new Promise((r) => setTimeout(r, 250));

      setEncodeStage("04. Embedding LSB Bits & Computing Metrics...");

      const result = await encodeAudioApi(selectedFile, message, password, lsbDepth);

      setStegoBlob(result.blob);
      setStegoFilename(result.filename);
      setMetrics(result.metrics);

      // Trigger browser download automatically
      const downloadUrl = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to encode message into audio.");
    } finally {
      setIsLoading(false);
      setEncodeStage(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6 font-mono">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-100">
            <Lock className="h-5 w-5 text-emerald-400" /> Audio Steganography Encode Workspace
          </h1>
          <p className="mt-1 font-sans text-xs text-zinc-400">
            Derive key via scrypt, encrypt with AES-256-GCM, format CWAV binary packet, and embed into PCM-16 audio LSB.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs">
          <span className="text-zinc-400">STATUS:</span>
          <span className="text-emerald-400 font-semibold">READY TO ENCRYPT</span>
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANE: Form Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleEncode} className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-5 space-y-5">
            <AudioUploader
              label="1. Carrier WAV Audio File"
              onFileSelect={(file, info) => {
                setSelectedFile(file);
                setWavInfo(info);
              }}
              selectedWavInfo={wavInfo}
            />

            {/* Secret Message Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-300">
                  2. Secret Message Payload <span className="text-rose-400">*</span>
                </label>
                <span className="text-[11px] text-zinc-400">{payloadBytesEstimate} Bytes (UTF-8)</span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter secret text payload to encrypt and conceal..."
                rows={4}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Secret Password & LSB Depth Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  3. Secret Password <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter encryption password..."
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  4. Steganographic LSB Depth
                </label>
                <select
                  value={lsbDepth}
                  onChange={(e) => setLsbDepth(Number(e.target.value) as 1 | 2)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value={1}>1-Bit LSB (Default, Max Quality)</option>
                  <option value={2}>2-Bit LSB (Experimental, 2x Capacity)</option>
                </select>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isCapacityOverflow || !selectedFile || !message.trim() || !password}
              className={`w-full flex items-center justify-center gap-2 rounded-md py-3 text-xs font-semibold transition ${
                isLoading || isCapacityOverflow || !selectedFile || !message.trim() || !password
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                  : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{encodeStage || "PROCESSING ENCRYPTION..."}</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>ENCRYPT & EMBED INTO AUDIO</span>
                </>
              )}
            </button>
          </form>

          {/* Audio Waveform Visualizer Preview */}
          {wavInfo && wavInfo.samples && (
            <WaveformVisualizer samples={wavInfo.samples} sampleRate={wavInfo.sampleRate} title="Carrier Audio Waveform Preview" />
          )}
        </div>

        {/* RIGHT PANE: Telemetry & Metrics Summary (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Real-time Audio Capacity Gauge Card */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Cpu className="h-4 w-4 text-cyan-400" /> CARRIER TELEMETRY & CAPACITY GAUGE
            </h3>

            {wavInfo ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Carrier File:</span>
                  <span className="font-semibold text-zinc-200">{wavInfo.filename}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Audio Specs:</span>
                  <span className="text-zinc-300">
                    {wavInfo.durationSeconds}s • {wavInfo.sampleRate}Hz • {wavInfo.channels === 1 ? "Mono" : "Stereo"}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Total PCM Samples:</span>
                  <span className="font-semibold text-cyan-400">{wavInfo.totalSamples.toLocaleString()}</span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Est. Packet / Capacity:</span>
                    <span className={isCapacityOverflow ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
                      {totalPacketEstimateBytes} B / {capacityBytes} B ({capacityBytes > 0 ? ((totalPacketEstimateBytes / capacityBytes) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-950">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isCapacityOverflow
                          ? "bg-rose-500"
                          : totalPacketEstimateBytes / capacityBytes > 0.8
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                      style={{
                        width: `${Math.min(100, capacityBytes > 0 ? (totalPacketEstimateBytes / capacityBytes) * 100 : 0)}%`,
                      }}
                    />
                  </div>

                  {isCapacityOverflow && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-400 pt-1">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      <span>Payload exceeds maximum audio carrier capacity!</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-zinc-400">
                Upload a .wav file on the left to inspect carrier audio metrics and capacity.
              </div>
            )}
          </div>

          {/* Encoding Results & Metrics Card */}
          {stegoBlob && metrics && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> ENCODING SUCCESSFUL
                </div>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">CWAV VERIFIED</span>
              </div>

              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Payload Size:</span>
                  <span className="font-semibold text-emerald-400">{metrics.payloadSize} Bytes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Signal-to-Noise Ratio (SNR):</span>
                  <span className="font-semibold text-cyan-400">{metrics.snrDb} dB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">RMS Distortion Error:</span>
                  <span className="text-zinc-200">{metrics.rmsError}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Changed Audio Samples:</span>
                  <span className="text-zinc-200">
                    {metrics.changedSamples} ({metrics.changedSamplesPercent}%)
                  </span>
                </div>
              </div>

              <a
                href={URL.createObjectURL(stegoBlob)}
                download={stegoFilename}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400"
              >
                <Download className="h-4 w-4" /> DOWNLOAD STEGO WAV ({stegoFilename})
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
