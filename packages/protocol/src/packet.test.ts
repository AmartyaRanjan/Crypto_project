import { expect, test, describe } from "bun:test";
import {
  encodeHeader,
  decodeHeader,
  encodePacket,
  decodePacket,
  PacketHeader,
  EncryptedPacket,
  KdfAlgorithm,
  CipherAlgorithm,
  PROTOCOL_VERSION,
} from "./index";

describe("Protocol Packet Serialization & Validation", () => {
  const validHeader: PacketHeader = {
    version: PROTOCOL_VERSION,
    kdfId: KdfAlgorithm.SCRYPT,
    cipherId: CipherAlgorithm.AES_256_GCM,
    flags: 0,
    sampleRate: 44100,
    channels: 2,
    bitsPerSample: 16,
    lsbDepth: 1,
    saltLength: 16,
    nonceLength: 12,
    tagLength: 16,
    payloadLength: 100,
  };

  test("Encode and decode valid header", () => {
    const headerBytes = encodeHeader(validHeader);
    expect(headerBytes.length).toBe(32);

    const decoded = decodeHeader(headerBytes);
    expect(decoded.version).toBe(PROTOCOL_VERSION);
    expect(decoded.kdfId).toBe(KdfAlgorithm.SCRYPT);
    expect(decoded.cipherId).toBe(CipherAlgorithm.AES_256_GCM);
    expect(decoded.sampleRate).toBe(44100);
    expect(decoded.channels).toBe(2);
    expect(decoded.bitsPerSample).toBe(16);
    expect(decoded.lsbDepth).toBe(1);
    expect(decoded.payloadLength).toBe(100);
  });

  test("Encode and decode full packet round-trip", () => {
    const salt = new Uint8Array(16).fill(0xaa);
    const nonce = new Uint8Array(12).fill(0xbb);
    const tag = new Uint8Array(16).fill(0xcc);
    const encryptedPayload = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    const packet: EncryptedPacket = {
      header: { ...validHeader },
      salt,
      nonce,
      tag,
      encryptedPayload,
    };

    const packedBytes = encodePacket(packet);
    const unpackedPacket = decodePacket(packedBytes);

    expect(unpackedPacket.header.payloadLength).toBe(8);
    expect(unpackedPacket.salt).toEqual(salt);
    expect(unpackedPacket.nonce).toEqual(nonce);
    expect(unpackedPacket.tag).toEqual(tag);
    expect(unpackedPacket.encryptedPayload).toEqual(encryptedPayload);
  });

  test("Reject invalid magic bytes", () => {
    const invalidHeaderBytes = encodeHeader(validHeader);
    invalidHeaderBytes[0] = 0x58; // 'X' instead of 'C'
    expect(() => decodeHeader(invalidHeaderBytes)).toThrow(/Invalid magic bytes/);
  });

  test("Reject unsupported version", () => {
    const badHeader = { ...validHeader, version: 99 };
    expect(() => encodeHeader(badHeader)).toThrow(/Unsupported protocol version/);
  });

  test("Reject truncated packet buffer", () => {
    const salt = new Uint8Array(16);
    const nonce = new Uint8Array(12);
    const tag = new Uint8Array(16);
    const encryptedPayload = new Uint8Array(100);

    const packet: EncryptedPacket = {
      header: { ...validHeader, payloadLength: 100 },
      salt,
      nonce,
      tag,
      encryptedPayload,
    };

    const fullBuffer = encodePacket(packet);
    const truncatedBuffer = fullBuffer.subarray(0, fullBuffer.length - 20);

    expect(() => decodePacket(truncatedBuffer)).toThrow(/Truncated packet/);
  });
});
