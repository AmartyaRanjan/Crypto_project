export const MAGIC_BYTES = new Uint8Array([0x43, 0x57, 0x41, 0x56]); // "CWAV"
export const PROTOCOL_VERSION = 1;

export enum KdfAlgorithm {
  SCRYPT = 1,
}

export enum CipherAlgorithm {
  AES_256_GCM = 1,
}

export enum PacketFlags {
  NONE = 0,
  ZLIB_COMPRESSED = 1,
}

export const HEADER_SIZE = 32;

// Security limits
export const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024; // 50 MB safety ceiling
export const MAX_SALT_SIZE = 64;
export const MAX_NONCE_SIZE = 64;
export const MAX_TAG_SIZE = 64;
