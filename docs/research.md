# CryptoWave Research Findings & Technical Decisions

## 1. Reference Analysis (Orion4D SecretAgent)
- **Encryption**: Orion4D uses AES-GCM with auto-save for encrypted payload protection. In our implementation, AES-256-GCM is selected with 12-byte IVs, 16-byte random salts per operation, and 16-byte authentication tags.
- **LSB Steganography**: Orion4D hid text within the LSB of PCM WAV files. We implement 1-bit LSB (and optional 2-bit LSB) operating directly on original 16-bit PCM integer samples (not resampled Float32 WebAudio data).
- **Redesign Choices**:
  - Web Audio API / Float32 conversion is avoided to eliminate precision degradation during steganographic bit manipulation.
  - A custom binary protocol header (`CWAV`) is designed for header validation, KDF identification, cipher identification, and payload length bounds safety.
  - scrypt is chosen over simple SHA/MD5 hashing for password key derivation.

## 2. Cryptographic Selection
- **Key Derivation Function (KDF)**: scrypt (`node:crypto` `scryptSync` / `scrypt`).
  - Salt size: 16 random bytes (generated per encryption via `crypto.getRandomValues` or `crypto.randomBytes`).
  - Key size: 32 bytes (256 bits).
  - Cost parameters: $N=32768$ ($2^{15}$), $r=8$, $p=1$.
- **Authenticated Encryption with Associated Data (AEAD)**: AES-256-GCM.
  - Nonce/IV: 12 random bytes per operation.
  - Tag: 16 bytes.
  - AAD (Authenticated Additional Data): Magic header, version, KDF ID, Cipher ID, audio format parameters (sample rate, channels, bits per sample). This ensures tampering with packet headers invalidates authentication during decryption.

## 3. Binary Protocol Specification
- Fixed-size 32-byte header containing:
  - Magic bytes: `CWAV` (`0x43 0x57 0x41 0x56`)
  - Version: `1` (`0x01`)
  - KDF ID: `1` (`0x01` = scrypt)
  - Cipher ID: `1` (`0x01` = AES-256-GCM)
  - Flags: `0x00`
  - Audio Params: Sample Rate (uint32), Channels (uint8), Bits Per Sample (uint8), LSB Depth (uint8), Reserved (uint8)
  - Length fields: Salt Length (uint32), Nonce Length (uint32), Tag Length (uint32), Payload Length (uint32)
- Bounds validation prevents buffer overflow attacks and unbounded memory allocations.

## 4. WAV / RIFF PCM Specification & Constraints
- Validates RIFF header (`RIFF` ... `WAVE`).
- Scans chunks dynamically to locate `fmt ` and `data` chunks, preserving or skipping unknown chunks (such as `LIST`, `JUNK`, metadata).
- Extracts and embeds raw 16-bit signed integer samples directly.

## 5. Steganography Capacity & Audio Quality
- **1-bit LSB**: Replaces bit 0 of each 16-bit sample.
  - Capacity formula: $\text{Capacity (bytes)} = \frac{\text{Total PCM Samples} \times \text{LSB Depth}}{8}$.
  - Audio distortion: $\pm 1$ amplitude count per sample. Perceptually transparent (SNR $> 80$ dB for 16-bit audio).
- **Fragility Note**: LSB steganography is fragile under amplitude scaling, resampling, and lossy compression (MP3/AAC). It is designed for lossless WAV transmission where plaintext confidentiality and casual invisibility are required.
