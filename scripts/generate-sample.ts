import { writeWav, WavAudio } from "@cryptowave/audio";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const samplesDir = join(process.cwd(), "samples");
if (!existsSync(samplesDir)) {
  mkdirSync(samplesDir, { recursive: true });
}

function generateSineWav(
  filename: string,
  durationSec = 3,
  frequency = 440,
  sampleRate = 44100,
  channels = 1
) {
  const sampleCount = sampleRate * durationSec;
  const samples = new Int16Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    // Generate clean audio waveform (16-bit PCM integer range)
    samples[i] = Math.round(16000 * Math.sin((2 * Math.PI * frequency * i) / sampleRate));
  }

  const audio: WavAudio = {
    sampleRate,
    channels,
    bitsPerSample: 16,
    samples,
  };

  const wavBytes = writeWav(audio);
  const filePath = join(samplesDir, filename);
  writeFileSync(filePath, wavBytes);
  console.log(`✅ Generated sample WAV file: ${filePath} (${wavBytes.length} bytes, ${durationSec}s, ${frequency}Hz)`);
}

generateSineWav("carrier.wav", 3, 440);
generateSineWav("music_mono.wav", 5, 523.25); // C5 note
generateSineWav("music_stereo.wav", 5, 659.25, 44100, 2); // E5 note stereo
