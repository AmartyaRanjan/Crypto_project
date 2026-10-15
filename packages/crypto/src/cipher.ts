import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { deriveKey, generateSalt, KEY_BYTE_LENGTH } from "./kdf";

export const NONCE_BYTE_LENGTH = 12; // 96 bits for GCM
export const TAG_BYTE_LENGTH = 16;   // 128-bit authentication tag

export interface EncryptionResult {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
  salt?: Uint8Array;
}

export function generateNonce(length = NONCE_BYTE_LENGTH): Uint8Array {
  return new Uint8Array(randomBytes(length));
}

export function encryptPayload(
  plaintext: Uint8Array,
  key: Uint8Array,
  aad?: Uint8Array
): EncryptionResult {
  if (key.length !== KEY_BYTE_LENGTH) {
    throw new Error(`Invalid key length for AES-256-GCM: expected ${KEY_BYTE_LENGTH} bytes, got ${key.length}`);
  }

  const nonce = generateNonce();
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key), Buffer.from(nonce));

  if (aad && aad.length > 0) {
    cipher.setAAD(Buffer.from(aad));
  }

  const ciphertextBuf = Buffer.concat([
    cipher.update(Buffer.from(plaintext)),
    cipher.final(),
  ]);
  const tagBuf = cipher.getAuthTag();

  return {
    ciphertext: new Uint8Array(ciphertextBuf.buffer, ciphertextBuf.byteOffset, ciphertextBuf.byteLength),
    nonce,
    tag: new Uint8Array(tagBuf.buffer, tagBuf.byteOffset, tagBuf.byteLength),
  };
}

export function decryptPayload(
  ciphertext: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  tag: Uint8Array,
  aad?: Uint8Array
): Uint8Array {
  if (key.length !== KEY_BYTE_LENGTH) {
    throw new Error(`Invalid key length for AES-256-GCM: expected ${KEY_BYTE_LENGTH} bytes, got ${key.length}`);
  }
  if (nonce.length !== NONCE_BYTE_LENGTH) {
    throw new Error(`Invalid nonce length for AES-256-GCM: expected ${NONCE_BYTE_LENGTH} bytes, got ${nonce.length}`);
  }
  if (tag.length !== TAG_BYTE_LENGTH) {
    throw new Error(`Invalid authentication tag length: expected ${TAG_BYTE_LENGTH} bytes, got ${tag.length}`);
  }

  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key), Buffer.from(nonce));
  decipher.setAuthTag(Buffer.from(tag));

  if (aad && aad.length > 0) {
    decipher.setAAD(Buffer.from(aad));
  }

  try {
    const plaintextBuf = Buffer.concat([
      decipher.update(Buffer.from(ciphertext)),
      decipher.final(),
    ]);
    return new Uint8Array(plaintextBuf.buffer, plaintextBuf.byteOffset, plaintextBuf.byteLength);
  } catch (err) {
    throw new Error("AES-GCM decryption / authentication failed. Incorrect password or tampered ciphertext/AAD.", { cause: err });
  }
}

export function encryptMessage(
  message: string | Uint8Array,
  password: string,
  aad?: Uint8Array
): EncryptionResult & { salt: Uint8Array } {
  const plaintext = typeof message === "string" ? new TextEncoder().encode(message) : message;
  const salt = generateSalt();
  const key = deriveKey(password, salt);
  
  const result = encryptPayload(plaintext, key, aad);
  return {
    ...result,
    salt,
  };
}

export function decryptMessage(
  ciphertext: Uint8Array,
  password: string,
  salt: Uint8Array,
  nonce: Uint8Array,
  tag: Uint8Array,
  aad?: Uint8Array
): Uint8Array {
  const key = deriveKey(password, salt);
  return decryptPayload(ciphertext, key, nonce, tag, aad);
}

export function encryptBytes(
  plaintext: Uint8Array,
  password: string,
  aad?: Uint8Array
): EncryptionResult & { salt: Uint8Array } {
  return encryptMessage(plaintext, password, aad);
}

export function decryptBytes(
  ciphertext: Uint8Array,
  password: string,
  salt: Uint8Array,
  nonce: Uint8Array,
  tag: Uint8Array,
  aad?: Uint8Array
): Uint8Array {
  return decryptMessage(ciphertext, password, salt, nonce, tag, aad);
}
