import { expect, test, describe } from "bun:test";
import {
  encryptMessage,
  decryptMessage,
  encryptPayload,
  decryptPayload,
  deriveKey,
  generateSalt,
  generateNonce,
} from "./index";

describe("Crypto Package Unit Tests", () => {
  const password = "SuperSecretPassword123!";
  const sampleMessage = "Hello CryptoWave audio steganography system 🔒🔊!";

  test("Encrypt and decrypt round trip with UTF-8 Unicode", () => {
    const encResult = encryptMessage(sampleMessage, password);
    expect(encResult.ciphertext).toBeDefined();
    expect(encResult.salt.length).toBe(16);
    expect(encResult.nonce.length).toBe(12);
    expect(encResult.tag.length).toBe(16);

    const decryptedBytes = decryptMessage(
      encResult.ciphertext,
      password,
      encResult.salt,
      encResult.nonce,
      encResult.tag
    );
    const recoveredText = new TextDecoder("utf-8").decode(decryptedBytes);
    expect(recoveredText).toBe(sampleMessage);
  });

  test("Two encryptions of same message produce distinct ciphertext/salt/nonce", () => {
    const enc1 = encryptMessage(sampleMessage, password);
    const enc2 = encryptMessage(sampleMessage, password);

    expect(enc1.salt).not.toEqual(enc2.salt);
    expect(enc1.nonce).not.toEqual(enc2.nonce);
    expect(enc1.ciphertext).not.toEqual(enc2.ciphertext);
  });

  test("Wrong password fails decryption with authentication error", () => {
    const encResult = encryptMessage(sampleMessage, password);
    expect(() =>
      decryptMessage(
        encResult.ciphertext,
        "WrongPassword",
        encResult.salt,
        encResult.nonce,
        encResult.tag
      )
    ).toThrow(/authentication failed/i);
  });

  test("Tampered ciphertext fails authentication", () => {
    const encResult = encryptMessage(sampleMessage, password);
    const tampered = new Uint8Array(encResult.ciphertext);
    tampered[0] ^= 0xff; // Flip bits

    expect(() =>
      decryptMessage(
        tampered,
        password,
        encResult.salt,
        encResult.nonce,
        encResult.tag
      )
    ).toThrow(/authentication failed/i);
  });

  test("Authenticated Additional Data (AAD) integrity check", () => {
    const aad = new Uint8Array([0x43, 0x57, 0x41, 0x56, 0x01]);
    const encResult = encryptMessage(sampleMessage, password, aad);

    // Decrypt with correct AAD -> Success
    const recovered = decryptMessage(
      encResult.ciphertext,
      password,
      encResult.salt,
      encResult.nonce,
      encResult.tag,
      aad
    );
    expect(new TextDecoder("utf-8").decode(recovered)).toBe(sampleMessage);

    // Decrypt with tampered AAD -> Failure
    const tamperedAad = new Uint8Array([0x43, 0x57, 0x41, 0x56, 0x02]);
    expect(() =>
      decryptMessage(
        encResult.ciphertext,
        password,
        encResult.salt,
        encResult.nonce,
        encResult.tag,
        tamperedAad
      )
    ).toThrow(/authentication failed/i);
  });
});
