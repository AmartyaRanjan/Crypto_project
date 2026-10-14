import { parseWav, writeWav, embedLSB, extractLSB, extractLSBHeader, calculateMetrics, WavAudio } from "@cryptowave/audio";
import { encryptMessage, decryptMessage } from "@cryptowave/crypto";
import { encodePacket, decodeHeader, decodePacket, KdfAlgorithm, CipherAlgorithm, PROTOCOL_VERSION, HEADER_SIZE, PacketHeader } from "@cryptowave/protocol";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

function parseArgs(args: string[]) {
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith("--")) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = "true";
      }
    }
  }
  return options;
}

const args = process.argv.slice(2);
const command = args[0];
const options = parseArgs(args.slice(1));

function printHelp() {
  console.log(`
CryptoWave CLI Usage:

  bun run encode -- --input <carrier.wav> --output <stego.wav> --message <text> --password <pass> [--lsbDepth 1|2]
  bun run decode -- --input <stego.wav> --password <pass> [--lsbDepth 1|2]
  bun run analyze -- --original <carrier.wav> --stego <stego.wav> [--lsbDepth 1|2]
`);
}

if (!command || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (command === "encode") {
  const { input, output, message, password, lsbDepth: rawDepth } = options;
  if (!input || !output || !message || !password) {
    console.error("Error: --input, --output, --message, and --password are required.");
    printHelp();
    process.exit(1);
  }

  const lsbDepth = rawDepth ? (Number(rawDepth) as 1 | 2) : 1;
  const audioBytes = new Uint8Array(readFileSync(input));
  const wavAudio = parseWav(audioBytes);

  const aadBuffer = new Uint8Array(16);
  const aadView = new DataView(aadBuffer.buffer);
  aadBuffer.set([0x43, 0x57, 0x41, 0x56], 0);
  aadView.setUint8(4, PROTOCOL_VERSION);
  aadView.setUint8(5, KdfAlgorithm.SCRYPT);
  aadView.setUint8(6, CipherAlgorithm.AES_256_GCM);
  aadView.setUint8(7, 0);
  aadView.setUint32(8, wavAudio.sampleRate, false);
  aadView.setUint8(12, wavAudio.channels);
  aadView.setUint8(13, wavAudio.bitsPerSample);
  aadView.setUint8(14, lsbDepth);

  const { ciphertext, salt, nonce, tag } = encryptMessage(message, password, aadBuffer);
  const packetHeader: PacketHeader = {
    version: PROTOCOL_VERSION,
    kdfId: KdfAlgorithm.SCRYPT,
    cipherId: CipherAlgorithm.AES_256_GCM,
    flags: 0,
    sampleRate: wavAudio.sampleRate,
    channels: wavAudio.channels,
    bitsPerSample: wavAudio.bitsPerSample,
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

  const stegoSamples = embedLSB(wavAudio.samples, packetBytes, lsbDepth);
  const stegoWavBytes = writeWav({ ...wavAudio, samples: stegoSamples });

  writeFileSync(output, stegoWavBytes);
  console.log(`✅ Successfully encoded payload into ${output}`);
} else if (command === "decode") {
  const { input, password, lsbDepth: rawDepth } = options;
  if (!input || !password) {
    console.error("Error: --input and --password are required.");
    printHelp();
    process.exit(1);
  }

  const lsbDepth = rawDepth ? (Number(rawDepth) as 1 | 2) : 1;
  const audioBytes = new Uint8Array(readFileSync(input));
  const wavAudio = parseWav(audioBytes);

  const headerBytes = extractLSBHeader(wavAudio.samples, lsbDepth);
  const header = decodeHeader(headerBytes);

  const totalLength = HEADER_SIZE + header.saltLength + header.nonceLength + header.tagLength + header.payloadLength;
  const packetBytes = extractLSB(wavAudio.samples, totalLength, lsbDepth);
  const packet = decodePacket(packetBytes);

  const aadBuffer = new Uint8Array(16);
  const aadView = new DataView(aadBuffer.buffer);
  aadBuffer.set([0x43, 0x57, 0x41, 0x56], 0);
  aadView.setUint8(4, header.version);
  aadView.setUint8(5, header.kdfId);
  aadView.setUint8(6, header.cipherId);
  aadView.setUint8(7, header.flags);
  aadView.setUint32(8, wavAudio.sampleRate, false);
  aadView.setUint8(12, wavAudio.channels);
  aadView.setUint8(13, wavAudio.bitsPerSample);
  aadView.setUint8(14, lsbDepth);

  const decryptedBytes = decryptMessage(
    packet.encryptedPayload,
    password,
    packet.salt,
    packet.nonce,
    packet.tag,
    aadBuffer
  );

  const message = new TextDecoder("utf-8").decode(decryptedBytes);
  console.log(`🔓 Decoded Message: "${message}"`);
} else if (command === "analyze") {
  const { original, stego, lsbDepth: rawDepth } = options;
  if (!original || !stego) {
    console.error("Error: --original and --stego are required.");
    printHelp();
    process.exit(1);
  }

  const lsbDepth = rawDepth ? (Number(rawDepth) as 1 | 2) : 1;
  const origAudio = parseWav(new Uint8Array(readFileSync(original)));
  const stegoAudio = parseWav(new Uint8Array(readFileSync(stego)));

  let detectedPayloadSize = 0;
  try {
    const headerBytes = extractLSBHeader(stegoAudio.samples, lsbDepth);
    const header = decodeHeader(headerBytes);
    detectedPayloadSize = header.payloadLength + HEADER_SIZE + header.saltLength + header.nonceLength + header.tagLength;
  } catch {}

  const metrics = calculateMetrics(origAudio.samples, stegoAudio.samples, detectedPayloadSize, lsbDepth);
  console.log("\n📊 Audio Distortion & Quality Metrics:");
  console.table(metrics);
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}
