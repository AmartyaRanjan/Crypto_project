"use client";

import { useEffect, useRef } from "react";
import { Activity } from "lucide-react";

interface SpectrogramVisualizerProps {
  samples: Int16Array;
  sampleRate?: number;
  height?: number;
  title?: string;
}

export function SpectrogramVisualizer({
  samples,
  sampleRate = 44100,
  height = 140,
  title = "Audio Spectrogram / Spectral Density",
}: SpectrogramVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !samples || samples.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;

    // Clear background
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, width, height);

    // Compute simple STFT window bins for visualization
    const numCols = Math.min(256, Math.floor(width));
    const samplesPerCol = Math.floor(samples.length / numCols);
    const colWidth = width / numCols;
    const numFreqBins = 32;
    const binHeight = height / numFreqBins;

    for (let c = 0; c < numCols; c++) {
      const colStart = c * samplesPerCol;
      const colSamples = samples.subarray(colStart, colStart + samplesPerCol);

      // Compute pseudo-spectral energy per frequency bin
      for (let b = 0; b < numFreqBins; b++) {
        let energy = 0;
        const freqBinMultiplier = (b + 1) * 0.05;
        for (let s = 0; s < colSamples.length; s++) {
          energy += Math.abs(colSamples[s] * Math.sin(s * freqBinMultiplier));
        }
        const avgEnergy = energy / Math.max(1, colSamples.length);
        const intensity = Math.min(1, avgEnergy / 10000);

        // Map intensity to thermal spectrogram color scale (Dark -> Blue -> Cyan -> Emerald -> Yellow -> Red)
        let color = "#09090b";
        if (intensity > 0.8) color = "#ef4444";      // Red
        else if (intensity > 0.6) color = "#f59e0b"; // Amber
        else if (intensity > 0.4) color = "#10b981"; // Emerald
        else if (intensity > 0.2) color = "#06b6d4"; // Cyan
        else if (intensity > 0.05) color = "#3b82f6"; // Blue

        ctx.fillStyle = color;
        // Invert Y axis so low frequencies are at bottom, high frequencies at top
        const y = height - (b + 1) * binHeight;
        ctx.fillRect(c * colWidth, y, colWidth + 0.5, binHeight + 0.5);
      }
    }
  }, [samples, sampleRate, height]);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-4 font-mono">
      <div className="mb-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <span className="font-semibold text-zinc-200">{title}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> High Energy
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400" /> Mid Energy
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Low Energy
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded border border-zinc-800/80 bg-zinc-950">
        <canvas ref={canvasRef} className="block w-full" style={{ height: `${height}px` }} />
      </div>
    </div>
  );
}
