"use client";

import { useState, useMemo } from "react";
import { Unlock, Download, CheckCircle2, AlertCircle, Loader2, Key, ShieldCheck, FileAudio, Lock, RefreshCw, Info } from "lucide-react";
import { AudioUploader } from "@/components/audio/AudioUploader";
import { ClientWavInfo } from "@/lib/audio/wavParser";
import { decodeAudioApi, restoreOriginalWavApi, DecodeSuccessResponse } from "@/lib/api/cryptoWave";

type RestoreStatus = "idle" | "loading" | "success" | "unavailable" | "error";

export default function DecodePage() {
  const [stegoFile, setStegoFile] = useState<File | null>(null);
  const [wavInfo, setWavInfo] = useState<ClientWavInfo | null>(null);
  const [password, setPassword] = useState("");
  const [lsbDepth, setLsbDepth] = useState<1 | 2>(1);

  const [isLoading, setIsLoading] = useState(false);
  const [decodeStage, setDecodeStage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [decodedResult, setDecodedResult] = useState<DecodeSuccessResponse | null>(null);

  const [restoreStatus, setRestoreStatus] = useState<RestoreStatus>("idle");
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [originalWavBlob, setOriginalWavBlob] = useState<Blob | null>(null);
  const [originalWavFilename, setOriginalWavFilename] = useState<string>("original.wav");

  const originalWavUrl = useMemo(
    () => (originalWavBlob ? URL.createObjectURL(originalWavBlob) : null),
    [originalWavBlob]
  );

  const handleDecode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setDecodedResult(null);
    setRestoreStatus("idle");
    setRestoreMsg(null);
    setOriginalWavBlob(null);

    if (!stegoFile) {
      setErrorMsg("Please upload a stego .wav audio file.");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter the decryption password.");
      return;
    }

    setIsLoading(true);
    try {
      setDecodeStage("01. Parsing Stego WAV & Extracting LSB Header...");
      await new Promise((r) => setTimeout(r, 200));

      setDecodeStage("02. Validating CWAV Binary Packet Format...");
      await new Promise((r) => setTimeout(r, 200));

      setDecodeStage("03. Deriving AES Key via scrypt KDF...");
      await new Promise((r) => setTimeout(r, 200));

      setDecodeStage("04. Verifying AES-GCM Auth Tag & Decrypting...");

      const res = await decodeAudioApi(stegoFile, password, lsbDepth);
      setDecodedResult(res);

      // Original-audio restoration runs as a separate step so a restoration
      // failure never hides a successfully decoded message.
      setDecodeStage("05. Restoring Original Audio from CWOR Recovery Chunk...");
      setRestoreStatus("loading");
      try {
        const restored = await restoreOriginalWavApi(stegoFile, password);
        setOriginalWavBlob(restored.blob);
        setOriginalWavFilename(restored.filename);
        setRestoreStatus("success");
        setRestoreMsg(null);
      } catch (restoreErr: any) {
        if (restoreErr?.errorCode === "RECOVERY_CHUNK_NOT_FOUND") {
          setRestoreStatus("unavailable");
          setRestoreMsg(
            "Original audio recovery is unavailable: this stego WAV has no recovery data (legacy file created before recovery support, or not produced by CryptoWave). The decoded message above is still valid."
          );
        } else {
          setRestoreStatus("error");
          setRestoreMsg(
            restoreErr?.message || "Original audio restoration failed. The decoded message above is still valid."
          );
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Check password or verify audio integrity.");
    } finally {
      setIsLoading(false);
      setDecodeStage(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6 font-mono">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-100">
            <Unlock className="h-5 w-5 text-cyan-400" /> Audio Steganography Decode Workspace
          </h1>
          <p className="mt-1 font-sans text-xs text-zinc-400">
            Extract CWAV binary packet from stego WAV audio LSB, verify AES-256-GCM authentication tag, and recover original plaintext message.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs">
          <span className="text-zinc-400">AUTHENTICATION:</span>
          <span className="text-cyan-400 font-semibold">AES-GCM VERIFIED</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANE: Decode Form Inputs (6 Cols) */}
        <div className="lg:col-span-6 space-y-5">
          <form onSubmit={handleDecode} className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-5 space-y-5">
            <AudioUploader
              label="1. Stego WAV Audio File"
              onFileSelect={(file, info) => {
                setStegoFile(file);
                setWavInfo(info);
              }}
              selectedWavInfo={wavInfo}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                2. Secret Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter decryption password..."
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                3. Steganographic LSB Depth
              </label>
              <select
                value={lsbDepth}
                onChange={(e) => setLsbDepth(Number(e.target.value) as 1 | 2)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value={1}>1-Bit LSB (Default)</option>
                <option value={2}>2-Bit LSB (Experimental)</option>
              </select>
            </div>

            {errorMsg && (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-400 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>DECRYPTION / AUTHENTICATION FAILED</span>
                </div>
                <p className="font-sans text-[11px] text-rose-300/80 leading-relaxed pl-6">{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !stegoFile || !password}
              className={`w-full flex items-center justify-center gap-2 rounded-md py-3 text-xs font-semibold transition ${
                isLoading || !stegoFile || !password
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                  : "bg-cyan-500 text-zinc-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{decodeStage || "DECRYPTING..."}</span>
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  <span>EXTRACT & DECRYPT MESSAGE</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT PANE: Decrypted Result & Metadata Output (6 Cols) */}
        <div className="lg:col-span-6 space-y-5">
          {decodedResult ? (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="h-4 w-4" /> AUTHENTICATED PLAINTEXT RECOVERED
                </div>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  AES-256-GCM VERIFIED
                </span>
              </div>

              {/* Message Display Area */}
              <div className="space-y-1.5">
                <div className="text-[11px] text-zinc-400">Recovered Message:</div>
                <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 font-sans text-sm font-medium text-zinc-100 whitespace-pre-wrap break-words">
                  {decodedResult.message}
                </div>
              </div>

              {/* Packet Metadata Details */}
              <div className="space-y-2 text-xs border-t border-zinc-800/80 pt-4 text-zinc-300">
                <div className="text-[11px] text-zinc-400 font-semibold mb-2">CWAV PACKET METADATA:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>Protocol Version: <span className="font-semibold text-emerald-400">CWAV v{decodedResult.packetInfo.version}</span></div>
                  <div>Key Derivation: <span className="font-semibold text-cyan-400">{decodedResult.packetInfo.kdf}</span></div>
                  <div>Cipher: <span className="font-semibold text-cyan-400">{decodedResult.packetInfo.cipher}</span></div>
                  <div>Payload Size: <span className="font-semibold text-zinc-200">{decodedResult.packetInfo.payloadSize} Bytes</span></div>
                  <div>Sample Rate: <span className="text-zinc-200">{decodedResult.packetInfo.sampleRate} Hz</span></div>
                  <div>Channels: <span className="text-zinc-200">{decodedResult.packetInfo.channels === 1 ? "Mono" : "Stereo"}</span></div>
                </div>
              </div>

              {/* Original Audio Restoration */}
              <div className="border-t border-zinc-800/80 pt-4">
                <div className="text-[11px] text-zinc-400 font-semibold mb-2">ORIGINAL AUDIO RESTORATION:</div>
                {restoreStatus === "loading" && (
                  <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    <span>Restoring original WAV from encrypted recovery chunk...</span>
                  </div>
                )}
                {restoreStatus === "success" && originalWavBlob && originalWavUrl && (
                  <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3.5 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>ORIGINAL WAV RESTORED (BYTE-IDENTICAL)</span>
                    </div>
                    <a
                      href={originalWavUrl}
                      download={originalWavFilename}
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400"
                    >
                      <Download className="h-4 w-4" /> Download Original WAV
                    </a>
                  </div>
                )}
                {restoreStatus === "unavailable" && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 space-y-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>ORIGINAL AUDIO UNAVAILABLE</span>
                    </div>
                    <p className="font-sans text-[11px] text-amber-200/80 leading-relaxed pl-6">{restoreMsg}</p>
                  </div>
                )}
                {restoreStatus === "error" && (
                  <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-400 space-y-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>ORIGINAL AUDIO RESTORATION FAILED</span>
                    </div>
                    <p className="font-sans text-[11px] text-rose-300/80 leading-relaxed pl-6">{restoreMsg}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-8 text-center space-y-3 font-mono">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-500">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-xs font-semibold text-zinc-300">Awaiting Stego Audio Extraction</h3>
              <p className="font-sans text-xs text-zinc-400 max-w-sm mx-auto">
                Upload a stego WAV audio file and enter the secret password to extract the embedded CWAV binary packet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
