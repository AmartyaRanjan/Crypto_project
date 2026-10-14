const BASE = "http://localhost:3001";
const SAMPLES = "C:\\Users\\window\\Desktop\\Learning\\crypto\\samples";

function createWavBuffer(sampleCount = 5000): Uint8Array {
  const samples = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = Math.round(12000 * Math.sin((2 * Math.PI * 440 * i) / 44100));
  }
  const bps = 2, ba = 1 * bps, br = 44100 * ba, ds = samples.length * bps;
  const buf = new Uint8Array(44 + ds);
  const v = new DataView(buf.buffer);
  buf.set([0x52,0x49,0x46,0x46],0); v.setUint32(4,36+ds,true); buf.set([0x57,0x41,0x56,0x45],8);
  buf.set([0x66,0x6d,0x74,0x20],12); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,44100,true); v.setUint32(28,br,true); v.setUint16(32,ba,true); v.setUint16(34,16,true);
  buf.set([0x64,0x61,0x74,0x61],36); v.setUint32(40,ds,true);
  let off = 44; for (let i = 0; i < samples.length; i++) { v.setInt16(off,samples[i],true); off += 2; }
  return buf;
}

let passed = 0, failed = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) { console.log(`  ✓ ${name}`); passed++; }
  else { console.log(`  ✗ ${name} ${detail}`); failed++; }
}

async function main() {
  console.log("=== CryptoWave Integration Test ===\n");

  // 1. Health
  console.log("1. Health Check");
  const health = await fetch(`${BASE}/health`);
  const healthData = await health.json();
  check("Status 200", health.status === 200);
  check("Status ok", healthData.status === "ok");
  check("Service name", healthData.service === "CryptoWave API");
  console.log();

  // 2. CORS
  console.log("2. CORS & Headers");
  const cors = await fetch(`${BASE}/health`, { headers: { Origin: "http://localhost:3000" } });
  check("ACAO is localhost:3000", cors.headers.get("access-control-allow-origin") === "http://localhost:3000");
  check("Expose headers present", cors.headers.get("access-control-expose-headers")?.includes("X-CryptoWave-Metrics"));
  check("Expose Content-Disposition", cors.headers.get("access-control-expose-headers")?.includes("Content-Disposition"));
  console.log();

  // 3. Encode
  console.log("3. Encode Audio");
  const carrier = await Bun.file(`${SAMPLES}\\carrier.wav`).arrayBuffer();
  const carrierBytes = new Uint8Array(carrier);
  const encodeForm = new FormData();
  encodeForm.append("audio", new Blob([carrierBytes], { type: "audio/wav" }), "carrier.wav");
  encodeForm.append("message", "Top secret operation message 🔒");
  encodeForm.append("password", "MySecretPassword123");
  encodeForm.append("lsbDepth", "1");
  const encodeRes = await fetch(`${BASE}/api/v1/encode`, { method: "POST", body: encodeForm });
  const ct = encodeRes.headers.get("content-type") || "";
  const cd = encodeRes.headers.get("content-disposition") || "";
  const metrics = encodeRes.headers.get("x-cryptowave-metrics");
  check("Content-Type audio/wav", ct.includes("audio/wav"), `got ${ct}`);
  check("Content-Disposition stego.wav", cd.includes("stego.wav"), `got ${cd}`);
  check("X-CryptoWave-Metrics present", !!metrics, metrics || "missing");
  const stegoBytes = new Uint8Array(await encodeRes.arrayBuffer());
  check("Response is WAV (>44 bytes)", stegoBytes.length > 44, `${stegoBytes.length} bytes`);
  await Bun.write(`${SAMPLES}\\stego.wav`, stegoBytes);
  console.log("  stego.wav downloaded");
  let metricsData = null;
  if (metrics) { try { metricsData = JSON.parse(metrics); } catch {} }
  if (metricsData) {
    check("SNR dB > 60", metricsData.snrDb > 60, `${metricsData.snrDb} dB`);
    check("Changed samples > 0", metricsData.changedSamples > 0);
    check("Changed bits > 0", metricsData.changedBits > 0);
    check("RMS error present", typeof metricsData.rmsError === "number");
    check("Capacity utilization", typeof metricsData.utilizationPercent === "number");
  }
  console.log();

  // 4. Decode correct password
  console.log("4. Decode (correct password)");
  const stegoFile = new Uint8Array(await Bun.file(`${SAMPLES}\\stego.wav`).arrayBuffer());
  const decodeForm = new FormData();
  decodeForm.append("stegoAudio", new Blob([stegoFile], { type: "audio/wav" }), "stego.wav");
  decodeForm.append("password", "MySecretPassword123");
  decodeForm.append("lsbDepth", "1");
  const decodeRes = await fetch(`${BASE}/api/v1/decode`, { method: "POST", body: decodeForm });
  const decodeData = await decodeRes.json();
  check("Decode status 200", decodeRes.status === 200, `got ${decodeRes.status}`);
  check("Decode success true", decodeData.success === true);
  check("Message matches", decodeData.message === "Top secret operation message 🔒", `got "${decodeData.message}"`);
  check("Protocol version CWAV v1", decodeData.packetInfo.version === 1);
  check("KDF is scrypt", decodeData.packetInfo.kdf?.toUpperCase().includes("SCR"), `got ${decodeData.packetInfo.kdf}`);
  check("Cipher is AES", decodeData.packetInfo.cipher === "AES_256_GCM" || decodeData.packetInfo.cipher.includes("AES"));
  console.log();

  // 5. Decode wrong password
  console.log("5. Decode (wrong password)");
  const wrongForm = new FormData();
  wrongForm.append("stegoAudio", new Blob([stegoFile], { type: "audio/wav" }), "stego.wav");
  wrongForm.append("password", "WrongPass");
  wrongForm.append("lsbDepth", "1");
  const wrongRes = await fetch(`${BASE}/api/v1/decode`, { method: "POST", body: wrongForm });
  check("Wrong pass status 401", wrongRes.status === 401, `got ${wrongRes.status}`);
  const wrongData = await wrongRes.json();
  check("Error message", wrongData.error?.includes("Authentication") || wrongData.error?.includes("failed"));
  console.log();

  // 6. Analyze
  console.log("6. Analyze");
  const origFile = new Uint8Array(await Bun.file(`${SAMPLES}\\carrier.wav`).arrayBuffer());
  const analyzeForm = new FormData();
  analyzeForm.append("originalAudio", new Blob([origFile], { type: "audio/wav" }), "carrier.wav");
  analyzeForm.append("stegoAudio", new Blob([stegoFile], { type: "audio/wav" }), "stego.wav");
  analyzeForm.append("lsbDepth", "1");
  const analyzeRes = await fetch(`${BASE}/api/v1/analyze`, { method: "POST", body: analyzeForm });
  const analyzeData = await analyzeRes.json();
  check("Analyze status 200", analyzeRes.status === 200, `got ${analyzeRes.status}`);
  check("Analyze success", analyzeData.success === true);
  check("SNR dB > 60", analyzeData.metrics.snrDb > 60, `${analyzeData.metrics.snrDb} dB`);
  check("RMS error > 0", analyzeData.metrics.rmsError > 0);
  check("Changed samples > 0", analyzeData.metrics.changedSamples > 0);
  check("Changed bits > 0", analyzeData.metrics.changedBits > 0);
  check("Has sampleRate", typeof analyzeData.audioProperties.sampleRate === "number");
  check("Has channels", typeof analyzeData.audioProperties.channels === "number");
  check("Has bitsPerSample", typeof analyzeData.audioProperties.bitsPerSample === "number");
  console.log();

  // 7. Attack Lab
  console.log("7. Attack Lab");
  const attackBuf = createWavBuffer(5000);
  const attackForm = new FormData();
  attackForm.append("audio", new Blob([attackBuf], { type: "audio/wav" }), "carrier.wav");
  attackForm.append("message", "Attack test");
  attackForm.append("password", "CorrectPassword123");
  attackForm.append("lsbDepth", "1");
  const atkEncode = await fetch(`${BASE}/api/v1/encode`, { method: "POST", body: attackForm });
  check("Attack encode 200", atkEncode.status === 200, `got ${atkEncode.status}`);
  const atkStego = new Uint8Array(await atkEncode.arrayBuffer());
  const atkDecode = new FormData();
  atkDecode.append("stegoAudio", new Blob([atkStego], { type: "audio/wav" }), "stego.wav");
  atkDecode.append("password", "WRONG_PASSWORD_999");
  atkDecode.append("lsbDepth", "1");
  const atkRes = await fetch(`${BASE}/api/v1/decode`, { method: "POST", body: atkDecode });
  check("Attack wrong pass 401", atkRes.status === 401, `got ${atkRes.status}`);
  console.log();

  // Summary
  console.log(`=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
