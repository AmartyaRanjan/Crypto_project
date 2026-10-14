"use client";

import { useState, useRef } from "react";
import { Upload, FileAudio, X, AlertCircle, Music } from "lucide-react";
import { parseClientWav, ClientWavInfo } from "@/lib/audio/wavParser";

interface AudioUploaderProps {
  label?: string;
  onFileSelect: (file: File | null, wavInfo: ClientWavInfo | null) => void;
  selectedWavInfo?: ClientWavInfo | null;
}

export function AudioUploader({
  label = "Carrier WAV File",
  onFileSelect,
  selectedWavInfo,
}: AudioUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setErrorMsg(null);

    if (!file.name.toLowerCase().endsWith(".wav")) {
      setErrorMsg("Invalid file format. Please upload an uncompressed .wav audio file.");
      onFileSelect(null, null);
      return;
    }

    try {
      const info = await parseClientWav(file);
      onFileSelect(file, info);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to parse WAV file metadata");
      onFileSelect(null, null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const clearSelection = () => {
    setErrorMsg(null);
    onFileSelect(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2 font-mono">
      <label className="block text-xs font-semibold text-zinc-300">
        {label} <span className="text-rose-400">*</span>
      </label>

      {selectedWavInfo ? (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <FileAudio className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-zinc-100">{selectedWavInfo.filename}</div>
              <div className="text-[11px] text-zinc-400">
                {(selectedWavInfo.sizeBytes / 1024).toFixed(1)} KB • {selectedWavInfo.durationSeconds}s •{" "}
                {selectedWavInfo.sampleRate} Hz • {selectedWavInfo.channels === 1 ? "Mono" : "Stereo"} (16-bit)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            title="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${
            isDragOver
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
              : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,audio/wav"
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 group-hover:text-emerald-400">
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-xs font-semibold text-zinc-200">
            Drop PCM-16 <span className="text-emerald-400">.WAV</span> file here, or click to browse
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">Supports 16-bit PCM uncompressed WAV audio files</p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
