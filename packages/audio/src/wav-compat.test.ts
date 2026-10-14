import { expect, test, describe } from "bun:test";
import { parseWav, writeWav } from "./index";

describe("WAV parser compatibility", () => {
  const samples = Int16Array.from([1, -2, 3, -4, 5, -6]);
  const base = () => writeWav({ sampleRate: 48000, channels: 2, bitsPerSample: 16, samples });

  test("accepts streaming data size 0xFFFFFFFF", () => {
    const wav = base();
    new DataView(wav.buffer).setUint32(40, 0xffffffff, true);
    expect(Array.from(parseWav(wav).samples)).toEqual(Array.from(samples));
  });

  test("accepts WAVE_FORMAT_EXTENSIBLE with PCM sub-format", () => {
    const plain = base();
    // fmt chunk grows from 16 to 40 bytes
    const out = new Uint8Array(plain.length + 24);
    out.set(plain.subarray(0, 36), 0);
    out.set(plain.subarray(36), 60);
    const v = new DataView(out.buffer);
    v.setUint32(4, out.length - 8, true);
    v.setUint32(16, 40, true);
    v.setUint16(20, 0xfffe, true);
    v.setUint16(36, 22, true); // cbSize
    v.setUint16(38, 16, true); // valid bits
    v.setUint32(40, 3, true); // channel mask
    v.setUint16(44, 1, true); // sub-format = PCM
    out.set([0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x80, 0x00, 0x00, 0xaa, 0x00, 0x38, 0x9b, 0x71], 46);
    const parsed = parseWav(out);
    expect(parsed.channels).toBe(2);
    expect(Array.from(parsed.samples)).toEqual(Array.from(samples));
  });

  test("rejects truncated fmt chunk with a clear error", () => {
    // fmt chunk header at offset 36 of a 44-byte file: body would overrun it
    const padded = new Uint8Array(44);
    padded.set(base().subarray(0, 12));
    new DataView(padded.buffer).setUint32(4, 36, true);
    padded.set([0x4a, 0x55, 0x4e, 0x4b, 16, 0, 0, 0], 12); // 16-byte JUNK chunk
    padded.set([0x66, 0x6d, 0x74, 0x20, 16, 0, 0, 0], 36); // "fmt " header only
    expect(() => parseWav(padded)).toThrow(/truncated fmt chunk/);
  });
});
