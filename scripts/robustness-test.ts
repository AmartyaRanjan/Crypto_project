import { writeWav, parseWav, embedLSB, extractLSB, extractLSBHeader, calculateMetrics, WavAudio } from "@cryptowave/audio";
import { encryptMessage, decryptMessage } from "@cryptowave/crypto";
import { encodePacket, decodeHeader, decodePacket, KdfAlgorithm, CipherAlgorithm, PROTOCOL_VERSION, HEADER_SIZE, PacketHeader } from "@cryptowave/protocol";

console.log("=================================================");
console.log("🛡️ CryptoWave Attack & Robustness Test Matrix");
console.log("=================================================\n");

// 1. Setup base carrier audio
const sampleRate = 44100;
const sampleCount = 44100 * 2; // 2 seconds
const carrierSamples = new Int16Array(sampleCount);
for (let i = 0; i < sampleCount; i++) {
  carrierSamples[i] = Math.round(15000 * Math.sin((2 * Math.PI * 440 * i) / sampleRate));
}

const secret = "Top Secret Agent Payload 🔒!";
const password = "RobustnessPass2026!";
const lsbDepth = 1;

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

const { ciphertext, salt, nonce, tag } = encryptMessage(secret, password, aadBuffer);
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

const stegoSamples = embedLSB(carrierSamples, packetBytes, lsbDepth);
const totalPacketLength = packetBytes.length;

// Test 1: Wrong Password
console.log("Test 1: Wrong Password Attack");
try {
  const extractedBytes = extractLSB(stegoSamples, totalPacketLength, lsbDepth);
  const packet = decodePacket(extractedBytes);
  decryptMessage(packet.encryptedPayload, "WrongPass", packet.salt, packet.nonce, packet.tag, aadBuffer);
  console.log("❌ Failed: Wrong password did not trigger authentication error");
} catch (err: any) {
  console.log("✅ Passed: Correctly failed authentication with wrong password\n");
}

// Test 2: Bit Flipping in Payload Region
console.log("Test 2: Bit Flipping in Audio Sample");
const tamperedSamples = new Int16Array(stegoSamples);
tamperedSamples[500] ^= 1; // flip LSB of sample 500
try {
  const extractedBytes = extractLSB(tamperedSamples, totalPacketLength, lsbDepth);
  const packet = decodePacket(extractedBytes);
  decryptMessage(packet.encryptedPayload, password, packet.salt, packet.nonce, packet.tag, aadBuffer);
  console.log("❌ Failed: Tampered LSB sample went undetected");
} catch (err: any) {
  console.log("✅ Passed: Cryptographic authentication detected tampered bit\n");
}

// Test 3: Volume Scaling (Amplitude Manipulation)
console.log("Test 3: Volume Amplification (2x Gain)");
const amplifiedSamples = new Int16Array(stegoSamples.length);
for (let i = 0; i < stegoSamples.length; i++) {
  amplifiedSamples[i] = Math.min(32767, Math.max(-32768, stegoSamples[i] * 2));
}
try {
  const extractedBytes = extractLSB(amplifiedSamples, totalPacketLength, lsbDepth);
  const packet = decodePacket(extractedBytes);
  decryptMessage(packet.encryptedPayload, password, packet.salt, packet.nonce, packet.tag, aadBuffer);
  console.log("ℹ️ Info: LSB payload unexpectedly survived volume scaling");
} catch (err: any) {
  console.log("✅ Expected Result: LSB steganography is fragile against amplitude scaling/volume changes (Extraction/Authentication failed as expected)\n");
}

console.log("=================================================");
console.log("🛡️ Robustness Testing Complete!");
console.log("=================================================");
