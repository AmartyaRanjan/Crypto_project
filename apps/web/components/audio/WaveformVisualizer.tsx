"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, ZoomIn, ZoomOut } from "lucide-react";

interface WaveformVisualizerProps {
  samples: Int16Array;
  sampleRate?: number;
  title?: string;
  compareSamples?: Int16Array; // Optional secondary waveform overlay
  height?: number;
}

export function WaveformVisualizer({
  samples,
  sampleRate = 44100,
  title = "PCM Audio Waveform",
  compareSamples,
  height = 160,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPos, setPlayheadPos] = useState(0); // 0 to 1
  const [zoom, setZoom] = useState(1);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const durationSec = samples.length > 0 ? samples.length / sampleRate : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !samples || samples.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);

    const width = rect.width;
    const midY = height / 2;

    // Clear background
    ctx.fillStyle = "#18181b"; // zinc-900
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.strokeStyle = "#27272a"; // zinc-800
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    const gridDivisions = 10;
    for (let i = 1; i < gridDivisions; i++) {
      const x = (width / gridDivisions) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Downsample for viewport width
    const step = Math.max(1, Math.floor((samples.length / width) / zoom));
    
    // Render Primary Waveform (Emerald)
    ctx.strokeStyle = "#34d399"; // emerald-400
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const idx = Math.floor(x * step);
      if (idx >= samples.length) break;
      const normalized = samples[idx] / 32768; // -1.0 to 1.0
      const y = midY - normalized * (midY - 10);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Render Overlay Waveform if compareSamples provided (Cyan)
    if (compareSamples && compareSamples.length === samples.length) {
      ctx.strokeStyle = "#22d3ee"; // cyan-400
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const idx = Math.floor(x * step);
        if (idx >= compareSamples.length) break;
        const normalized = compareSamples[idx] / 32768;
        const y = midY - normalized * (midY - 10);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Render Playhead Line (Rose)
    if (playheadPos > 0) {
      const playheadX = playheadPos * width;
      ctx.strokeStyle = "#f43f5e"; // rose-500
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [samples, compareSamples, playheadPos, zoom, height]);

  // Audio Playback Handler
  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playAudio();
    }
  };

  const playAudio = () => {
    if (!samples || samples.length === 0) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate });
      audioCtxRef.current = ctx;

      const audioBuf = ctx.createBuffer(1, samples.length, sampleRate);
      const channelData = audioBuf.getChannelData(0);
      for (let i = 0; i < samples.length; i++) {
        channelData[i] = samples[i] / 32768;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.connect(ctx.destination);

      source.onended = () => {
        setIsPlaying(false);
        setPlayheadPos(0);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      startTimeRef.current = ctx.currentTime;
      source.start(0);
      sourceNodeRef.current = source;
      setIsPlaying(true);

      const updateProgress = () => {
        if (!audioCtxRef.current) return;
        const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
        const pos = Math.min(1, elapsed / durationSec);
        setPlayheadPos(pos);
        if (pos < 1 && isPlaying) {
          animFrameRef.current = requestAnimationFrame(updateProgress);
        }
      };
      animFrameRef.current = requestAnimationFrame(updateProgress);
    } catch (err) {
      console.error("Failed to play audio:", err);
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {}
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
    }
    setIsPlaying(false);
    setPlayheadPos(0);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-4 font-mono">
      <div className="mb-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-zinc-200">{title}</span>
          <span className="text-[11px] text-zinc-400">({durationSec.toFixed(2)}s, {sampleRate}Hz)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
            className="rounded border border-zinc-800 p-1 hover:bg-zinc-800 hover:text-zinc-200"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[36px] text-center text-zinc-300">{zoom.toFixed(1)}x</span>
          <button
            onClick={() => setZoom((z) => Math.min(8, z + 0.5))}
            className="rounded border border-zinc-800 p-1 hover:bg-zinc-800 hover:text-zinc-200"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded border border-zinc-800/80 bg-zinc-950">
        <canvas ref={canvasRef} className="block w-full" style={{ height: `${height}px` }} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-400 hover:bg-emerald-500/20"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPlaying ? "PAUSE" : "PLAY AUDIO"}
          </button>

          {isPlaying && (
            <button
              onClick={stopAudio}
              className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-800/50 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
            >
              <RotateCcw className="h-3 w-3" /> STOP
            </button>
          )}
        </div>

        <div className="text-[11px] text-zinc-400">
          POS: <span className="font-semibold text-zinc-200">{(playheadPos * durationSec).toFixed(2)}s</span> / {durationSec.toFixed(2)}s
        </div>
      </div>
    </div>
  );
}
