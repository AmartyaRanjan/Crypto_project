import { expect, test, describe } from "bun:test";
import {
  parseWav,
  writeWav,
  WavAudio,
  embedLSB,
  extractLSB,
  calculateCapacity,
  calculateMetrics,
} from "./index";

describe("Audio Package Unit Tests", () => {
  // Helper to construct a simple synth WAV
  function createSyntheticAudio(sampleCount = 1000, sampleRate = 44100, channels = 1): WavAudio {
    const samples = new Int16Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      // 440 Hz Sine wave in 16-bit PCM integer
      samples[i] = Math.round(15000 * Math.sin((2 * Math.PI * 440 * i) / sampleRate));
    }
    return {
      sampleRate,
      channels,
      bitsPerSample: 16,
      samples,
    };
  }

  test("Wav parse and write round trip", () => {
    const audio = createSyntheticAudio(1000, 44100, 2);
    const wavBuffer = writeWav(audio);
    expect(wavBuffer.length).toBeGreaterThan(44);

    const parsed = parseWav(wavBuffer);
    expect(parsed.sampleRate).toBe(44100);
    expect(parsed.channels).toBe(2);
    expect(parsed.bitsPerSample).toBe(16);
    expect(parsed.samples.length).toBe(1000);
    expect(parsed.samples).toEqual(audio.samples);
  });

  test("LSB embedding and extraction round trip (1-bit)", () => {
    const audio = createSyntheticAudio(2000);
    const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x42, 0x77, 0xff, 0x00]);

    const stegoSamples = embedLSB(audio.samples, payload, 1);
    expect(stegoSamples).not.toEqual(audio.samples);

    const extracted = extractLSB(stegoSamples, payload.length, 1);
    expect(extracted).toEqual(payload);
  });

  test("LSB embedding and extraction round trip (2-bit)", () => {
    const audio = createSyntheticAudio(1000);
    const payload = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc]);

    const stegoSamples = embedLSB(audio.samples, payload, 2);
    const extracted = extractLSB(stegoSamples, payload.length, 2);
    expect(extracted).toEqual(payload);
  });

  test("Embed payload exceeding capacity throws error", () => {
    const audio = createSyntheticAudio(100); // 100 samples = 12 bytes capacity in 1-bit LSB
    const oversizedPayload = new Uint8Array(20);

    expect(() => embedLSB(audio.samples, oversizedPayload, 1)).toThrow(/exceeds audio capacity/);
  });

  test("Audio metrics computation", () => {
    const audio = createSyntheticAudio(1000);
    const payload = new Uint8Array([0x55, 0xaa, 0x55, 0xaa]);

    const stegoSamples = embedLSB(audio.samples, payload, 1);
    const metrics = calculateMetrics(audio.samples, stegoSamples, payload.length, 1);

    expect(metrics.sampleCount).toBe(1000);
    expect(metrics.capacity).toBe(125);
    expect(metrics.payloadSize).toBe(4);
    expect(metrics.snrDb).toBeGreaterThan(60); // High quality LSB stego
    expect(metrics.changedSamples).toBeGreaterThan(0);
    expect(metrics.changedBits).toBeGreaterThan(0);
  });
});
