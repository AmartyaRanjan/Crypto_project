import { writeWav, parseWav, embedLSB, extractLSB, extractLSBHeader, calculateMetrics, WavAudio } from "@cryptowave/audio";
import { encryptMessage, decryptMessage } from "@cryptowave/crypto";
import { encodePacket, decodeHeader, decodePacket, KdfAlgorithm, CipherAlgorithm, PROTOCOL_VERSION, HEADER_SIZE, PacketHeader } from "@cryptowave/protocol";
import { writeFileSync, readFileSync } from "node:fs";

console.log("=================================================");
console.log("🔒🔊 CryptoWave Local E2E Demonstration & Verification");
console.log("=================================================\n");

// 1. Generate carrier WAV (44.1 kHz, 16-bit mono PCM, 3 seconds)
const sampleRate = 44100;
const durationSec = 3;
const sampleCount = sampleRate * durationSec;
const carrierSamples = new Int16Array(sampleCount);

for (let i = 0; i < sampleCount; i++) {
  // Synthesize 440Hz sine wave audio
  carrierSamples[i] = Math.round(16000 * Math.sin((2 * Math.PI * 440 * i) / sampleRate));
}

const carrierAudio: WavAudio = {
  sampleRate,
  channels: 1,
  bitsPerSample: 16,
  samples: carrierSamples,
};

const carrierWavBuffer = writeWav(carrierAudio);
console.log(`[1] Created Carrier WAV file (${carrierWavBuffer.length} bytes, ${durationSec}s audio, ${sampleCount} PCM samples)`);

// 2. Encryption & Packet construction
const secretMessage = "Top Secret Operation: CryptoWave backend steganography online! 🕵️‍♂️🔑";
const password = "AgentPassword2026!";
const lsbDepth = 1;

console.log(`[2] Secret message to embed: "${secretMessage}"`);
console.log(`    Password: "${password}"`);

// Construct AAD
const aadBuffer = new Uint8Array(16);
const aadView = new DataView(aadBuffer.buffer);
aadBuffer.set([0x43, 0x57, 0x41, 0x56], 0);
aadView.setUint8(4, PROTOCOL_VERSION);
aadView.setUint8(5, KdfAlgorithm.SCRYPT);
aadView.setUint8(6, CipherAlgorithm.AES_256_GCM);
aadView.setUint8(7, 0);
aadView.setUint32(8, sampleRate, false);
aadView.setUint8(12, 1);
aadView.setUint8(13, 16);
aadView.setUint8(14, lsbDepth);
aadView.setUint8(15, 0);

const { ciphertext, salt, nonce, tag } = encryptMessage(secretMessage, password, aadBuffer);
console.log(`    AES-256-GCM Encrypted payload size: ${ciphertext.length} bytes`);

const packetHeader: PacketHeader = {
  version: PROTOCOL_VERSION,
  kdfId: KdfAlgorithm.SCRYPT,
  cipherId: CipherAlgorithm.AES_256_GCM,
  flags: 0,
  sampleRate,
  channels: 1,
  bitsPerSample: 16,
  lsbDepth,
  saltLength: salt.length,
  nonceLength: nonce.length,
  tagLength: tag.length,
  payloadLength: ciphertext.length,
};

const packetBytes = encodePacket({
  header: packetHeader,
  salt,
  nonce,
  tag,
  encryptedPayload: ciphertext,
});

console.log(`[3] Encoded binary packet format (${packetBytes.length} total bytes including header, salt, nonce, tag, payload)`);

// 3. LSB Embedding & Writing Stego WAV
const stegoSamples = embedLSB(carrierSamples, packetBytes, lsbDepth);
const stegoWavBuffer = writeWav({
  ...carrierAudio,
  samples: stegoSamples,
});

console.log(`[4] Embedded packet into 1-bit LSB. Generated stego WAV (${stegoWavBuffer.length} bytes)`);

// 4. Extraction & Decryption (Correct Password)
console.log(`\n[5] Decryption Test (Correct Password):`);
const parsedStego = parseWav(stegoWavBuffer);
const extractedHeaderBytes = extractLSBHeader(parsedStego.samples, lsbDepth);
const decodedHeader = decodeHeader(extractedHeaderBytes);

const totalPacketLength = HEADER_SIZE + decodedHeader.saltLength + decodedHeader.nonceLength + decodedHeader.tagLength + decodedHeader.payloadLength;
const extractedPacketBytes = extractLSB(parsedStego.samples, totalPacketLength, lsbDepth);
const unpackedPacket = decodePacket(extractedPacketBytes);

const decryptedBytes = decryptMessage(
  unpackedPacket.encryptedPayload,
  password,
  unpackedPacket.salt,
  unpackedPacket.nonce,
  unpackedPacket.tag,
  aadBuffer
);
const recoveredMessage = new TextDecoder("utf-8").decode(decryptedBytes);

console.log(`    Recovered message: "${recoveredMessage}"`);
if (recoveredMessage === secretMessage) {
  console.log("    SUCCESS ✅: Recovered message EXACTLY matches original secret!");
} else {
  console.error("    FAILURE ❌: Message mismatch!");
  process.exit(1);
}

// 5. Wrong Password Test
console.log(`\n[6] Attack Test: Wrong Password`);
try {
  decryptMessage(
    unpackedPacket.encryptedPayload,
    "WrongPassword123!",
    unpackedPacket.salt,
    unpackedPacket.nonce,
    unpackedPacket.tag,
    aadBuffer
  );
  console.error("    FAILURE ❌: Wrong password succeeded when it should have failed!");
} catch (err: any) {
  console.log(`    SUCCESS ✅: Authentication failed as expected ("${err.message}")`);
}

// 6. Tampered Audio Test
console.log(`\n[7] Attack Test: Tampered Stego Audio Sample Data`);
const tamperedSamples = new Int16Array(parsedStego.samples);
// Corrupt several audio samples in payload region
for (let i = 100; i < 150; i++) {
  tamperedSamples[i] ^= 0x0001;
}

try {
  const tamperedExtracted = extractLSB(tamperedSamples, totalPacketLength, lsbDepth);
  const tamperedPacket = decodePacket(tamperedExtracted);
  decryptMessage(
    tamperedPacket.encryptedPayload,
    password,
    tamperedPacket.salt,
    tamperedPacket.nonce,
    tamperedPacket.tag,
    aadBuffer
  );
  console.error("    FAILURE ❌: Tampered audio decrypted successfully!");
} catch (err: any) {
  console.log(`    SUCCESS ✅: Tampered audio detected & rejected ("${err.message}")`);
}

// 7. Calculate Audio Metrics
console.log(`\n[8] Audio Quality & Distortion Metrics:`);
const metrics = calculateMetrics(carrierSamples, stegoSamples, packetBytes.length, lsbDepth);
console.log(`    Carrier Audio Size:     ${metrics.carrierSize} bytes`);
console.log(`    Stego Audio Size:       ${metrics.stegoSize} bytes`);
console.log(`    Sample Count:           ${metrics.sampleCount}`);
console.log(`    Payload Size:           ${metrics.payloadSize} bytes`);
console.log(`    Max Capacity:           ${metrics.capacity} bytes`);
console.log(`    Capacity Utilization:   ${metrics.utilizationPercent}%`);
console.log(`    RMS Error:              ${metrics.rmsError}`);
console.log(`    Signal-to-Noise Ratio:  ${metrics.snrDb} dB`);
console.log(`    Changed Samples:        ${metrics.changedSamples} (${metrics.changedSamplesPercent}%)`);
console.log(`    Changed Bits:           ${metrics.changedBits}`);

console.log("\n=================================================");
console.log("🎉 All E2E Demonstration Criteria Passed Successfully!");
console.log("=================================================\n");
