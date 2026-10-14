# CryptoWave Quick Start & E2E Demo Guide

This guide walks through building, testing, and running the CryptoWave backend system locally.

## Prerequisites
- **Bun** (v1.0+) installed

## Installation & Setup
```bash
bun install
```

## Running Verification Commands
```bash
bun run check-types   # Strict TypeScript type check across monorepo
bun run test          # Execute unit and API integration tests
bun run demo          # Run local E2E audio steganography demo
```

## Developer CLI Usage
Encode secret message into carrier WAV:
```bash
bun run encode -- --input carrier.wav --output stego.wav --message "Secret agent message" --password "MyPassword123"
```

Decode secret message from stego WAV:
```bash
bun run decode -- --input stego.wav --password "MyPassword123"
```

Analyze distortion metrics between original and stego WAV:
```bash
bun run analyze -- --original carrier.wav --stego stego.wav
```

## Running the HTTP API Server
```bash
bun --filter @cryptowave/api dev
```
The server starts at `http://localhost:3000`. Endpoints available:
- `GET /health`
- `POST /api/v1/encode`
- `POST /api/v1/decode`
- `POST /api/v1/analyze`
