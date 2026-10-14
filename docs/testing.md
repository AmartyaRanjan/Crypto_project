# CryptoWave Testing Guide

CryptoWave features comprehensive testing using `bun test`.

## Test Suites
1. **Unit Tests**:
   - `packages/crypto/src/crypto.test.ts`: Scrypt KDF, AES-256-GCM encryption/decryption, AAD integrity, wrong password authentication failure, Unicode UTF-8 handling.
   - `packages/protocol/src/packet.test.ts`: Binary packet header encoding/decoding, magic byte validation, version checks, packet truncation checks.
   - `packages/audio/src/audio.test.ts`: RIFF WAV parser/writer roundtrips, 1-bit and 2-bit LSB embedding/extraction, capacity limits, audio quality metrics.
2. **API Integration Tests**:
   - `apps/api/src/api.test.ts`: End-to-end HTTP API tests for `/health`, `/api/v1/encode`, `/api/v1/decode`, and `/api/v1/analyze`.
3. **E2E & Robustness Scripts**:
   - `scripts/demo.ts`: Complete terminal-driven end-to-end verification.
   - `scripts/robustness-test.ts`: Robustness matrix against wrong passwords, sample bit-flipping, and amplitude scaling.

## Command Execution
```bash
bun test                    # Run all test suites
bun run demo                # Run terminal E2E demonstration
bun run scripts/robustness-test.ts # Run attack & robustness matrix
```
