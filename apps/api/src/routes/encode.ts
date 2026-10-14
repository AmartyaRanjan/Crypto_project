import { Elysia, t } from "elysia";
import { parseWav, writeWav, embedLSB, calculateCapacity, calculateMetrics } from "@cryptowave/audio";
import { encryptMessage } from "@cryptowave/crypto";
import {
  encodePacket,
  KdfAlgorithm,
  CipherAlgorithm,
  PROTOCOL_VERSION,
  HEADER_SIZE,
  PacketHeader,
} from "@cryptowave/protocol";

export const encodeRoute = new Elysia().post(
  "/api/v1/encode",
  async ({ body, set }) => {
    const { audio, message, password, lsbDepth: rawLsbDepth } = body;

    const lsbDepth = rawLsbDepth ? (Number(rawLsbDepth) as 1 | 2) : 1;
    if (lsbDepth !== 1 && lsbDepth !== 2) {
      set.status = 400;
      return { error: "Invalid lsbDepth. Only 1 or 2 supported." };
    }

    if (!password || password.length === 0) {
      set.status = 400;
      return { error: "Password cannot be empty" };
    }

    if (!message || message.length === 0) {
      set.status = 400;
      return { error: "Message cannot be empty" };
    }

    const audioArrayBuffer = await audio.arrayBuffer();
    const audioBytes = new Uint8Array(audioArrayBuffer);

    let wavAudio;
    try {
      wavAudio = parseWav(audioBytes);
    } catch (err: any) {
      set.status = 400;
      return { error: `Invalid audio file: ${err.message}` };
    }

    // Construct AAD from header metadata
    const dummyHeader: PacketHeader = {
      version: PROTOCOL_VERSION,
      kdfId: KdfAlgorithm.SCRYPT,
      cipherId: CipherAlgorithm.AES_256_GCM,
      flags: 0,
      sampleRate: wavAudio.sampleRate,
      channels: wavAudio.channels,
      bitsPerSample: wavAudio.bitsPerSample,
      lsbDepth,
      saltLength: 16,
      nonceLength: 12,
      tagLength: 16,
      payloadLength: 0,
    };

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
    aadView.setUint8(15, 0);

    const { ciphertext, salt, nonce, tag } = encryptMessage(message, password, aadBuffer);

    const packetHeader: PacketHeader = {
      ...dummyHeader,
      payloadLength: ciphertext.length,
    };

    const packetBytes = encodePacket({
      header: packetHeader,
      salt,
      nonce,
      tag,
      encryptedPayload: ciphertext,
    });

    const availableCapacity = calculateCapacity(wavAudio.samples.length, lsbDepth);
    if (packetBytes.length > availableCapacity) {
      set.status = 400;
      return {
        error: `Packet size (${packetBytes.length} bytes) exceeds audio carrier capacity (${availableCapacity} bytes).`,
        packetSize: packetBytes.length,
        capacity: availableCapacity,
      };
    }

    const stegoSamples = embedLSB(wavAudio.samples, packetBytes, lsbDepth);

    const stegoWavBytes = writeWav({
      ...wavAudio,
      samples: stegoSamples,
    });

    const metrics = calculateMetrics(
      wavAudio.samples,
      stegoSamples,
      packetBytes.length,
      lsbDepth
    );

    set.headers["Content-Type"] = "audio/wav";
    set.headers["Content-Disposition"] = 'attachment; filename="stego.wav"';
    set.headers["X-CryptoWave-Metrics"] = JSON.stringify(metrics);

    return new Response(Buffer.from(stegoWavBytes), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": 'attachment; filename="stego.wav"',
        "X-CryptoWave-Metrics": JSON.stringify(metrics),
      },
    });
  },
  {
    body: t.Object({
      audio: t.File(),
      message: t.String(),
      password: t.String(),
      lsbDepth: t.Optional(t.Union([t.String(), t.Number()])),
    }),
  }
);
