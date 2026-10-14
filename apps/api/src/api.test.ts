import { expect, test, describe } from "bun:test";
import { app } from "./app";
import { writeWav, WavAudio } from "@cryptowave/audio";

describe("CryptoWave Elysia API Integration Tests", () => {
  function createCarrierWavBuffer(sampleCount = 5000): Uint8Array {
    const samples = new Int16Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      samples[i] = Math.round(12000 * Math.sin((2 * Math.PI * 440 * i) / 44100));
    }
    const audio: WavAudio = {
      sampleRate: 44100,
      channels: 1,
      bitsPerSample: 16,
      samples,
    };
    return writeWav(audio);
  }

  test("GET /health returns OK", async () => {
    const res = await app.handle(new Request("http://localhost/health"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe("ok");
    expect(data.service).toBe("CryptoWave API");
  });

  test("POST /api/v1/encode and /api/v1/decode E2E pipeline", async () => {
    const carrierWav = createCarrierWavBuffer(10000);
    const message = "Secret API Payload Message 🚀🔒";
    const password = "SuperSecureApiPassword99!";

    // 1. Encode message into carrier audio
    const formData = new FormData();
    formData.append("audio", new Blob([Buffer.from(carrierWav)], { type: "audio/wav" }), "carrier.wav");
    formData.append("message", message);
    formData.append("password", password);
    formData.append("lsbDepth", "1");

    const encodeRes = await app.handle(
      new Request("http://localhost/api/v1/encode", {
        method: "POST",
        body: formData,
      })
    );

    expect(encodeRes.status).toBe(200);
    expect(encodeRes.headers.get("content-type")).toBe("audio/wav");

    const stegoWavBuffer = new Uint8Array(await encodeRes.arrayBuffer());
    expect(stegoWavBuffer.length).toBeGreaterThan(44);

    // 2. Decode stego audio with correct password
    const decodeFormData = new FormData();
    decodeFormData.append("stegoAudio", new Blob([Buffer.from(stegoWavBuffer)], { type: "audio/wav" }), "stego.wav");
    decodeFormData.append("password", password);
    decodeFormData.append("lsbDepth", "1");

    const decodeRes = await app.handle(
      new Request("http://localhost/api/v1/decode", {
        method: "POST",
        body: decodeFormData,
      })
    );

    expect(decodeRes.status).toBe(200);
    const decodeJson = (await decodeRes.json()) as any;
    expect(decodeJson.success).toBe(true);
    expect(decodeJson.message).toBe(message);

    // 3. Decode with wrong password -> 401
    const wrongPassFormData = new FormData();
    wrongPassFormData.append("stegoAudio", new Blob([Buffer.from(stegoWavBuffer)], { type: "audio/wav" }), "stego.wav");
    wrongPassFormData.append("password", "WrongPassword!");

    const wrongPassRes = await app.handle(
      new Request("http://localhost/api/v1/decode", {
        method: "POST",
        body: wrongPassFormData,
      })
    );

    expect(wrongPassRes.status).toBe(401);
    const wrongPassJson = (await wrongPassRes.json()) as any;
    expect(wrongPassJson.error).toContain("Authentication failed");
  });

  test("POST /api/v1/analyze calculates distortion metrics", async () => {
    const carrierWav = createCarrierWavBuffer(10000);
    const formData = new FormData();
    formData.append("audio", new Blob([Buffer.from(carrierWav)], { type: "audio/wav" }), "carrier.wav");
    formData.append("message", "Analyze test payload");
    formData.append("password", "TestPass123");

    const encodeRes = await app.handle(
      new Request("http://localhost/api/v1/encode", {
        method: "POST",
        body: formData,
      })
    );
    const stegoWavBuffer = new Uint8Array(await encodeRes.arrayBuffer());

    const analyzeFormData = new FormData();
    analyzeFormData.append("originalAudio", new Blob([Buffer.from(carrierWav)], { type: "audio/wav" }), "carrier.wav");
    analyzeFormData.append("stegoAudio", new Blob([Buffer.from(stegoWavBuffer)], { type: "audio/wav" }), "stego.wav");

    const analyzeRes = await app.handle(
      new Request("http://localhost/api/v1/analyze", {
        method: "POST",
        body: analyzeFormData,
      })
    );

    expect(analyzeRes.status).toBe(200);
    const analyzeJson = (await analyzeRes.json()) as any;
    expect(analyzeJson.success).toBe(true);
    expect(analyzeJson.metrics.snrDb).toBeGreaterThan(60);
    expect(analyzeJson.metrics.changedSamples).toBeGreaterThan(0);
  });
});
