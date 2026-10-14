# CryptoWave Threat Model

## Protected Security Guarantees
1. **Confidentiality**: Plaintext messages are encrypted using AES-256-GCM. Without the correct password, ciphertext payload cannot be decrypted.
2. **Authenticity & Integrity**: AES-256-GCM authentication tags + AAD metadata validation prevent payload tampering or unauthorized packet header modifications.
3. **Nonce/Salt Freshness**: Fresh 16-byte scrypt salts and fresh 12-byte AES nonces are generated for every single encryption operation.

## System Non-Guarantees & Limitations
1. **Statistical Steganalysis**: LSB steganography does not guarantee immunity against high-order statistical steganalysis (e.g., chi-square analysis).
2. **Transform Robustness**: LSB steganography does not survive lossy compression (MP3/AAC), volume amplitude changes, or audio resampling.
3. **Endpoint Security**: The backend assumes a trusted runtime environment (no memory inspection or key logging on host machine).
