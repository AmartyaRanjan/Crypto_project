const BASE = "http://localhost:3001";

async function createWavBuffer(sampleCount = 5000): Promise<Uint8Array> {
  const samples = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = Math.round(12000 * Math.sin((2 * Math.PI * 440 * i) / 44100));
  }
  const bytesPerSample = 2;
  const blockAlign = 1 * bytesPerSample;
  const byteRate = 44100 * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer);
  buffer.set([0x52, 0x49, 0x46, 0x46], 0);
  view.setUint32(4, 36 + dataSize, true);
  buffer.set([0x57, 0x41, 0x56, 0x45], 8);
  buffer.set([0x66, 0x6d, 0x74, 0x20], 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 44100, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  buffer.set([0x64, 0x61, 0x74, 0x61], 36);
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, samples[i], true);
    offset += 2;
  }
  return buffer;
}

async function main() {
  const carrierBuf = await createWavBuffer(5000);
  const formData = new FormData();
  formData.append("audio", new Blob([carrierBuf], { type: "audio/wav" }), "carrier.wav");
  formData.append("message", "Top secret operation message 🔒");
  formData.append("password", "MySecretPassword123");
  formData.append("lsbDepth", "1");

  const res = await fetch(`${BASE}/api/v1/encode`, { method: "POST", body: formData });
  console.log("Status:", res.status);
  console.log("Content-Type:", res.headers.get("content-type"));
  console.log("Content-Disposition:", res.headers.get("content-disposition"));
  console.log("X-CryptoWave-Metrics:", res.headers.get("x-cryptowave-metrics"));
  const text = await res.text();
  console.log("Body (first 500 chars):", text.substring(0, 500));
}

main().catch((err) => { console.error(err); process.exit(1); });
