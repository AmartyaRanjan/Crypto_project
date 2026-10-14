import {
  MAGIC_BYTES,
  PROTOCOL_VERSION,
  KdfAlgorithm,
  CipherAlgorithm,
  HEADER_SIZE,
  MAX_PAYLOAD_SIZE,
  MAX_SALT_SIZE,
  MAX_NONCE_SIZE,
  MAX_TAG_SIZE,
} from "./constants";

export interface PacketHeader {
  version: number;
  kdfId: KdfAlgorithm;
  cipherId: CipherAlgorithm;
  flags: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  lsbDepth: number;
  saltLength: number;
  nonceLength: number;
  tagLength: number;
  payloadLength: number;
}

export interface EncryptedPacket {
  header: PacketHeader;
  salt: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
  encryptedPayload: Uint8Array;
}

export function encodeHeader(header: PacketHeader): Uint8Array {
  validateHeader(header);

  const buffer = new Uint8Array(HEADER_SIZE);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Magic bytes: 0..3 ("CWAV")
  buffer.set(MAGIC_BYTES, 0);

  // Protocol version, KDF, Cipher, Flags: 4..7
  view.setUint8(4, header.version);
  view.setUint8(5, header.kdfId);
  view.setUint8(6, header.cipherId);
  view.setUint8(7, header.flags);

  // Audio metadata: 8..15
  view.setUint32(8, header.sampleRate, false); // Big endian
  view.setUint8(12, header.channels);
  view.setUint8(13, header.bitsPerSample);
  view.setUint8(14, header.lsbDepth);
  view.setUint8(15, 0); // Reserved byte

  // Component lengths: 16..31
  view.setUint32(16, header.saltLength, false);
  view.setUint32(20, header.nonceLength, false);
  view.setUint32(24, header.tagLength, false);
  view.setUint32(28, header.payloadLength, false);

  return buffer;
}

export function decodeHeader(buffer: Uint8Array): PacketHeader {
  if (buffer.length < HEADER_SIZE) {
    throw new Error(`Invalid header length: expected at least ${HEADER_SIZE} bytes, got ${buffer.length}`);
  }

  // Verify Magic bytes
  for (let i = 0; i < MAGIC_BYTES.length; i++) {
    if (buffer[i] !== MAGIC_BYTES[i]) {
      throw new Error(`Invalid magic bytes: packet is not a valid CWAV format`);
    }
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const header: PacketHeader = {
    version: view.getUint8(4),
    kdfId: view.getUint8(5),
    cipherId: view.getUint8(6),
    flags: view.getUint8(7),
    sampleRate: view.getUint32(8, false),
    channels: view.getUint8(12),
    bitsPerSample: view.getUint8(13),
    lsbDepth: view.getUint8(14),
    saltLength: view.getUint32(16, false),
    nonceLength: view.getUint32(20, false),
    tagLength: view.getUint32(24, false),
    payloadLength: view.getUint32(28, false),
  };

  validateHeader(header);
  return header;
}

export function validateHeader(header: PacketHeader): void {
  if (header.version !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported protocol version: ${header.version}. Supported version is ${PROTOCOL_VERSION}`);
  }
  if (header.kdfId !== KdfAlgorithm.SCRYPT) {
    throw new Error(`Unsupported KDF algorithm ID: ${header.kdfId}`);
  }
  if (header.cipherId !== CipherAlgorithm.AES_256_GCM) {
    throw new Error(`Unsupported cipher algorithm ID: ${header.cipherId}`);
  }
  if (header.sampleRate <= 0 || header.sampleRate > 384000) {
    throw new Error(`Invalid sample rate: ${header.sampleRate}`);
  }
  if (header.channels !== 1 && header.channels !== 2) {
    throw new Error(`Unsupported channel count: ${header.channels} (only mono=1 or stereo=2 supported)`);
  }
  if (header.bitsPerSample !== 16) {
    throw new Error(`Unsupported bits per sample: ${header.bitsPerSample} (only 16-bit PCM supported)`);
  }
  if (header.lsbDepth !== 1 && header.lsbDepth !== 2) {
    throw new Error(`Invalid LSB depth: ${header.lsbDepth} (only 1-bit or 2-bit supported)`);
  }
  if (header.saltLength > MAX_SALT_SIZE) {
    throw new Error(`Salt length exceeds security limit: ${header.saltLength} > ${MAX_SALT_SIZE}`);
  }
  if (header.nonceLength > MAX_NONCE_SIZE) {
    throw new Error(`Nonce length exceeds security limit: ${header.nonceLength} > ${MAX_NONCE_SIZE}`);
  }
  if (header.tagLength > MAX_TAG_SIZE) {
    throw new Error(`Tag length exceeds security limit: ${header.tagLength} > ${MAX_TAG_SIZE}`);
  }
  if (header.payloadLength > MAX_PAYLOAD_SIZE) {
    throw new Error(`Payload length exceeds maximum allowed limit: ${header.payloadLength} > ${MAX_PAYLOAD_SIZE}`);
  }
}

export function encodePacket(packet: EncryptedPacket): Uint8Array {
  // Sync length fields with actual Uint8Array lengths
  packet.header.saltLength = packet.salt.length;
  packet.header.nonceLength = packet.nonce.length;
  packet.header.tagLength = packet.tag.length;
  packet.header.payloadLength = packet.encryptedPayload.length;

  const headerBytes = encodeHeader(packet.header);
  const totalLength = HEADER_SIZE + packet.salt.length + packet.nonce.length + packet.tag.length + packet.encryptedPayload.length;
  
  const buffer = new Uint8Array(totalLength);
  let offset = 0;

  buffer.set(headerBytes, offset);
  offset += HEADER_SIZE;

  buffer.set(packet.salt, offset);
  offset += packet.salt.length;

  buffer.set(packet.nonce, offset);
  offset += packet.nonce.length;

  buffer.set(packet.tag, offset);
  offset += packet.tag.length;

  buffer.set(packet.encryptedPayload, offset);
  
  return buffer;
}

export function decodePacket(buffer: Uint8Array): EncryptedPacket {
  const header = decodeHeader(buffer);
  
  const expectedTotalLength = HEADER_SIZE + header.saltLength + header.nonceLength + header.tagLength + header.payloadLength;
  if (buffer.length < expectedTotalLength) {
    throw new Error(`Truncated packet: header specifies ${expectedTotalLength} total bytes, but buffer only has ${buffer.length} bytes`);
  }

  let offset = HEADER_SIZE;

  const salt = buffer.subarray(offset, offset + header.saltLength);
  offset += header.saltLength;

  const nonce = buffer.subarray(offset, offset + header.nonceLength);
  offset += header.nonceLength;

  const tag = buffer.subarray(offset, offset + header.tagLength);
  offset += header.tagLength;

  const encryptedPayload = buffer.subarray(offset, offset + header.payloadLength);

  return {
    header,
    salt,
    nonce,
    tag,
    encryptedPayload,
  };
}
