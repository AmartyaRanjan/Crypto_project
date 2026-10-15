# Original Audio Recovery (`CWOR` Chunk)

After encoding, CryptoWave preserves an encrypted, recoverable copy of the
**complete original WAV file** inside the resulting `stego.wav`. After decoding
the secret message, the same password can restore the original WAV
**byte-for-byte identical** to the file uploaded during encoding (headers,
chunk layout, metadata, and PCM samples).

Important distinction: the stego WAV's audio samples are still modified to
carry the hidden message. Only the separately restored `original.wav` is
guaranteed identical to the input — the stego carrier itself is not unchanged.

## How it works

1. **Encode** (`POST /api/v1/encode`) keeps an exact copy of the uploaded WAV
   bytes before parsing or modifying anything.
2. The message is encrypted (scrypt + AES-256-GCM), packed into the existing
   CWAV packet, embedded with the existing LSB algorithm, and written with the
   existing `writeWav` — all unchanged.
3. The original WAV bytes are encrypted with a **separate recovery encryption
   context** (fresh random salt, fresh nonce, independent derived key,
   domain-separated AAD) and appended as a versioned `CWOR` RIFF chunk.
4. **Decode** (`POST /api/v1/decode`) returns the plaintext message plus a
   `recoveryAvailable` flag.
5. **Restore** (`POST /api/v1/restore`) extracts the `CWOR` chunk, verifies
   authentication, decrypts the original bytes, and returns them as a binary
   `audio/wav` download (`original.wav`).

## Recovery chunk layout

The chunk follows RIFF rules: 4-byte id `CWOR`, little-endian 32-bit size
(excluding the 8-byte chunk header), 1-byte zero padding when the payload
length is odd, and an updated RIFF size field (`file length - 8`).

Chunk payload (all multi-byte integers little-endian):

```
 0-3:   "CWOR" magic
 4:     recovery format version (1)
 5:     KDF id (1 = scrypt, mirrors protocol KdfAlgorithm.SCRYPT)
 6:     cipher id (1 = AES-256-GCM, mirrors protocol CipherAlgorithm.AES_256_GCM)
 7:     flags (0, reserved)
 8-11:  original WAV length (uint32)
 12-13: salt length, always 16 (uint16)
 14-15: nonce length, always 12 (uint16)
 16-17: tag length, always 16 (uint16)
 18-21: ciphertext length (uint32, equals original length for GCM)
 22-23: reserved (0)
 24-39:  salt (16 bytes)
 40-51:  nonce (12 bytes)
 52-67:  auth tag (16 bytes)
 68-...: encrypted original WAV bytes
```

## Recovery encryption context

- Raw WAV bytes are encrypted directly as binary — never converted to UTF-8.
- Key derivation reuses the existing scrypt parameters (N=32768, r=8, p=1)
  with a **fresh random 16-byte salt**, producing a key independent from the
  message-encryption key.
- AES-256-GCM uses a **fresh random 12-byte nonce** (never the message nonce).
- The 16-byte AAD (`"CWOR" | version | kdfId | cipherId | flags |
  originalLength | reserved`) binds the recovery metadata to the ciphertext,
  so tampered lengths or version bytes fail authentication.
- No passwords, keys, plaintext, or audio contents are logged.
- Chunk boundaries, version, algorithm ids, and lengths are validated before
  any large allocation; ciphertexts above 100 MB are rejected.

## File-size overhead

The recovery chunk is stored in the WAV container, **not** in the LSB samples,
so it does not affect payload-capacity calculations. Overhead per stego file:

```
8 (chunk header) + 24 (recovery header) + 16 + 12 + 16 (salt/nonce/tag)
+ originalWavLength [+ 1 pad byte if the payload length is odd]
= originalWavLength + 76 (or 77) bytes
```

In other words, `stego.wav` is roughly **twice the original file size**.
The `X-CryptoWave-Metrics` header still describes only the LSB distortion; the
recovery chunk is additional container overhead on top of the reported sizes.

## API contracts

### `POST /api/v1/encode` (updated)

Same request/response as before, except the returned `stego.wav` now contains
the `CWOR` recovery chunk. Metrics header unchanged.

### `POST /api/v1/decode` (additive change)

Success response gains one field:

```json
{
  "success": true,
  "message": "…",
  "recoveryAvailable": true,
  "packetInfo": { "version": 1, "kdf": "SCRYPT", "cipher": "AES_256_GCM", "payloadSize": 42, "sampleRate": 44100, "channels": 1, "lsbDepth": 1 }
}
```

`recoveryAvailable` is `false` for legacy stego files without a `CWOR` chunk;
message decoding still works for those files.

### `POST /api/v1/restore` (new)

- Request: `multipart/form-data` with `stegoAudio` (file) and `password` (string).
- Success: `200` with `Content-Type: audio/wav`,
  `Content-Disposition: attachment; filename="original.wav"`, body = exact
  original WAV bytes.
- Errors (JSON `{ "error": "…" }` plus an `X-CryptoWave-Error-Code` header):
  - `400 RECOVERY_CHUNK_NOT_FOUND` — no recovery chunk (legacy file).
  - `400 RECOVERY_FORMAT_INVALID` — corrupted/unsupported chunk.
  - `401 RECOVERY_AUTH_FAILED` — wrong password or tampered data.
  - `422 RECOVERY_PAYLOAD_INVALID` — decrypted payload is not a valid WAV.
  - `413` — upload exceeds the 160 MB limit.

## Limitations

- Stego files created before recovery support have no `CWOR` chunk: messages
  still decode, but original-audio restoration reports unavailable instead of
  returning the modified carrier.
- Recovery roughly doubles the stego file size; uploads above 160 MB and
  recovery payloads above 100 MB are rejected.
- Only 16-bit PCM mono/stereo WAV input is supported (unchanged).
