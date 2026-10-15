export const RECOVERY_CHUNK_ID = "CWOR";
export const RECOVERY_CHUNK_ID_BYTES = new Uint8Array([0x43, 0x57, 0x4f, 0x52]); // "CWOR"
export const RECOVERY_FORMAT_VERSION = 1;

// Mirrors KdfAlgorithm.SCRYPT in @cryptowave/protocol
export const RECOVERY_KDF_ID = 1;
// Mirrors CipherAlgorithm.AES_256_GCM in @cryptowave/protocol
export const RECOVERY_CIPHER_ID = 1;

export const RECOVERY_SALT_LENGTH = 16;
export const RECOVERY_NONCE_LENGTH = 12;
export const RECOVERY_TAG_LENGTH = 16;

export const RECOVERY_HEADER_SIZE = 24;
export const MAX_RECOVERY_PAYLOAD_SIZE = 100 * 1024 * 1024; // 100 MB safety ceiling

export class RecoveryChunkNotFoundError extends Error {
  readonly code = "RECOVERY_CHUNK_NOT_FOUND";

  constructor(message = "No CWOR recovery chunk found in WAV container") {
    super(message);
    this.name = "RecoveryChunkNotFoundError";
  }
}

export class RecoveryFormatError extends Error {
  readonly code = "RECOVERY_FORMAT_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "RecoveryFormatError";
  }
}

export interface RecoveryChunk {
  version: number;
  kdfId: number;
  cipherId: number;
  flags: number;
  originalLength: number;
  saltLength: number;
  nonceLength: number;
  tagLength: number;
  ciphertextLength: number;
  salt: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
  ciphertext: Uint8Array;
}

export function buildRecoveryAad(
  originalLength: number,
  version: number = RECOVERY_FORMAT_VERSION,
  kdfId: number = RECOVERY_KDF_ID,
  cipherId: number = RECOVERY_CIPHER_ID,
  flags = 0
): Uint8Array {
  if (originalLength < 0 || originalLength > 0xffffffff) {
    throw new Error(`Invalid original length for recovery AAD: ${originalLength}`);
  }
  const aad = new Uint8Array(16);
  const view = new DataView(aad.buffer, aad.byteOffset, aad.byteLength);
  aad.set(RECOVERY_CHUNK_ID_BYTES, 0);
  view.setUint8(4, version);
  view.setUint8(5, kdfId);
  view.setUint8(6, cipherId);
  view.setUint8(7, flags);
  view.setUint32(8, originalLength, false);
  return aad;
}

function validateWavContainer(wavBytes: Uint8Array): void {
  if (wavBytes.length < 12) {
    throw new RecoveryFormatError(`Invalid WAV container: minimum length is 12 bytes, got ${wavBytes.length}`);
  }
  const riffMagic = String.fromCharCode(wavBytes[0], wavBytes[1], wavBytes[2], wavBytes[3]);
  if (riffMagic !== "RIFF") {
    throw new RecoveryFormatError(`Invalid WAV container: missing RIFF magic bytes, found '${riffMagic}'`);
  }
  const waveMagic = String.fromCharCode(wavBytes[8], wavBytes[9], wavBytes[10], wavBytes[11]);
  if (waveMagic !== "WAVE") {
    throw new RecoveryFormatError(`Invalid WAV container: missing WAVE format bytes, found '${waveMagic}'`);
  }
}

function serializeRecoveryHeader(recovery: RecoveryChunk): Uint8Array {
  const header = new Uint8Array(RECOVERY_HEADER_SIZE);
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  header.set(RECOVERY_CHUNK_ID_BYTES, 0);
  view.setUint8(4, recovery.version);
  view.setUint8(5, recovery.kdfId);
  view.setUint8(6, recovery.cipherId);
  view.setUint8(7, recovery.flags);
  view.setUint32(8, recovery.originalLength, true);
  view.setUint16(12, recovery.saltLength, true);
  view.setUint16(14, recovery.nonceLength, true);
  view.setUint16(16, recovery.tagLength, true);
  view.setUint32(18, recovery.ciphertextLength, true);
  view.setUint16(22, 0, true);
  return header;
}

function parseRecoveryChunkData(data: Uint8Array): RecoveryChunk {
  if (data.length < RECOVERY_HEADER_SIZE) {
    throw new RecoveryFormatError(
      `Truncated recovery chunk: expected at least ${RECOVERY_HEADER_SIZE} bytes, got ${data.length}`
    );
  }

  for (let i = 0; i < RECOVERY_CHUNK_ID_BYTES.length; i++) {
    if (data[i] !== RECOVERY_CHUNK_ID_BYTES[i]) {
      throw new RecoveryFormatError("Invalid recovery chunk magic bytes: expected 'CWOR'");
    }
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const recovery: RecoveryChunk = {
    version: view.getUint8(4),
    kdfId: view.getUint8(5),
    cipherId: view.getUint8(6),
    flags: view.getUint8(7),
    originalLength: view.getUint32(8, true),
    saltLength: view.getUint16(12, true),
    nonceLength: view.getUint16(14, true),
    tagLength: view.getUint16(16, true),
    ciphertextLength: view.getUint32(18, true),
    salt: new Uint8Array(0),
    nonce: new Uint8Array(0),
    tag: new Uint8Array(0),
    ciphertext: new Uint8Array(0),
  };

  if (recovery.version !== RECOVERY_FORMAT_VERSION) {
    throw new RecoveryFormatError(
      `Unsupported recovery format version: ${recovery.version}. Supported version is ${RECOVERY_FORMAT_VERSION}`
    );
  }
  if (recovery.kdfId !== RECOVERY_KDF_ID) {
    throw new RecoveryFormatError(`Unsupported recovery KDF algorithm ID: ${recovery.kdfId}`);
  }
  if (recovery.cipherId !== RECOVERY_CIPHER_ID) {
    throw new RecoveryFormatError(`Unsupported recovery cipher algorithm ID: ${recovery.cipherId}`);
  }
  if (recovery.saltLength !== RECOVERY_SALT_LENGTH) {
    throw new RecoveryFormatError(`Unsupported recovery salt length: ${recovery.saltLength}`);
  }
  if (recovery.nonceLength !== RECOVERY_NONCE_LENGTH) {
    throw new RecoveryFormatError(`Unsupported recovery nonce length: ${recovery.nonceLength}`);
  }
  if (recovery.tagLength !== RECOVERY_TAG_LENGTH) {
    throw new RecoveryFormatError(`Unsupported recovery tag length: ${recovery.tagLength}`);
  }
  if (recovery.ciphertextLength > MAX_RECOVERY_PAYLOAD_SIZE) {
    throw new RecoveryFormatError(
      `Recovery ciphertext length exceeds maximum allowed limit: ${recovery.ciphertextLength} > ${MAX_RECOVERY_PAYLOAD_SIZE}`
    );
  }
  if (recovery.originalLength !== recovery.ciphertextLength) {
    throw new RecoveryFormatError(
      `Recovery length mismatch: originalLength ${recovery.originalLength} != ciphertextLength ${recovery.ciphertextLength}`
    );
  }

  const expectedTotalLength =
    RECOVERY_HEADER_SIZE + recovery.saltLength + recovery.nonceLength + recovery.tagLength + recovery.ciphertextLength;
  if (data.length !== expectedTotalLength) {
    throw new RecoveryFormatError(
      `Corrupted recovery chunk: header specifies ${expectedTotalLength} total bytes, got ${data.length}`
    );
  }

  let offset = RECOVERY_HEADER_SIZE;
  recovery.salt = data.subarray(offset, offset + recovery.saltLength);
  offset += recovery.saltLength;
  recovery.nonce = data.subarray(offset, offset + recovery.nonceLength);
  offset += recovery.nonceLength;
  recovery.tag = data.subarray(offset, offset + recovery.tagLength);
  offset += recovery.tagLength;
  recovery.ciphertext = data.subarray(offset, offset + recovery.ciphertextLength);

  return recovery;
}

export function appendRecoveryChunk(wavBytes: Uint8Array, recovery: RecoveryChunk): Uint8Array {
  validateWavContainer(wavBytes);

  if (recovery.ciphertext.length > MAX_RECOVERY_PAYLOAD_SIZE) {
    throw new Error(
      `Recovery payload size (${recovery.ciphertext.length} bytes) exceeds maximum allowed limit (${MAX_RECOVERY_PAYLOAD_SIZE} bytes)`
    );
  }
  if (recovery.originalLength !== recovery.ciphertext.length) {
    throw new Error(
      `Recovery length mismatch: originalLength ${recovery.originalLength} != ciphertext length ${recovery.ciphertext.length}`
    );
  }

  const header = serializeRecoveryHeader(recovery);
  const payloadLength =
    header.length + recovery.salt.length + recovery.nonce.length + recovery.tag.length + recovery.ciphertext.length;
  const paddingLength = payloadLength % 2;
  const newTotalLength = wavBytes.length + 8 + payloadLength + paddingLength;

  if (newTotalLength - 8 > 0xffffffff) {
    throw new Error("RIFF size overflow: appending recovery chunk would exceed the 4 GB RIFF limit");
  }

  const result = new Uint8Array(newTotalLength);
  result.set(wavBytes, 0);
  result.set(RECOVERY_CHUNK_ID_BYTES, wavBytes.length);
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  view.setUint32(wavBytes.length + 4, payloadLength, true);

  let offset = wavBytes.length + 8;
  result.set(header, offset);
  offset += header.length;
  result.set(recovery.salt, offset);
  offset += recovery.salt.length;
  result.set(recovery.nonce, offset);
  offset += recovery.nonce.length;
  result.set(recovery.tag, offset);
  offset += recovery.tag.length;
  result.set(recovery.ciphertext, offset);

  view.setUint32(4, newTotalLength - 8, true);
  return result;
}

export function findRecoveryChunkOffset(wavBytes: Uint8Array): number | null {
  validateWavContainer(wavBytes);

  const view = new DataView(wavBytes.buffer, wavBytes.byteOffset, wavBytes.byteLength);
  let offset = 12;

  while (offset + 8 <= wavBytes.length) {
    const chunkId = String.fromCharCode(
      wavBytes[offset],
      wavBytes[offset + 1],
      wavBytes[offset + 2],
      wavBytes[offset + 3]
    );
    const chunkSize = view.getUint32(offset + 4, true);
    const dataStart = offset + 8;

    if (dataStart + chunkSize > wavBytes.length) {
      throw new RecoveryFormatError(
        `Corrupted RIFF chunk '${chunkId}': chunk size ${chunkSize} extends beyond file size ${wavBytes.length}`
      );
    }

    if (chunkId === RECOVERY_CHUNK_ID) {
      return offset;
    }

    offset = dataStart + chunkSize + (chunkSize % 2);
  }

  return null;
}

export function extractRecoveryChunk(wavBytes: Uint8Array): RecoveryChunk {
  validateWavContainer(wavBytes);

  const view = new DataView(wavBytes.buffer, wavBytes.byteOffset, wavBytes.byteLength);
  let offset = 12;

  while (offset + 8 <= wavBytes.length) {
    const chunkId = String.fromCharCode(
      wavBytes[offset],
      wavBytes[offset + 1],
      wavBytes[offset + 2],
      wavBytes[offset + 3]
    );
    const chunkSize = view.getUint32(offset + 4, true);
    const dataStart = offset + 8;

    if (dataStart + chunkSize > wavBytes.length) {
      throw new RecoveryFormatError(
        `Corrupted RIFF chunk '${chunkId}': chunk size ${chunkSize} extends beyond file size ${wavBytes.length}`
      );
    }

    if (chunkId === RECOVERY_CHUNK_ID) {
      return parseRecoveryChunkData(wavBytes.subarray(dataStart, dataStart + chunkSize));
    }

    offset = dataStart + chunkSize + (chunkSize % 2);
  }

  throw new RecoveryChunkNotFoundError();
}
