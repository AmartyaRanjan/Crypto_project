# CryptoWave Frontend Design System & Template Selection

## 1. Selected v0 Template
- **Exact Template Name**: Pulse – Engineering Metrics & Incident Response Console
- **Exact v0 URL**: [https://v0.dev/t/pulse-engineering-console](https://v0.dev/t/pulse-engineering-console)
- **Selection Rationale**:
  CryptoWave is a password-protected audio steganography and cryptography laboratory. A generic marketing SaaS or standard admin template lacks the technical rigor required for a security demonstration. The **Pulse – Engineering Metrics & Incident Response Console** template provides:
  - High data density suitable for security telemetry, cryptographic metadata, audio properties, and bit-level metrics.
  - Dark engineering aesthetic (`bg-zinc-950`, `border-zinc-800/80`, `text-zinc-100`) with clean contrast.
  - Monospaced typography accents (`font-mono`) for protocol identifiers, byte lengths, hashes, and hexadecimal flags.
  - Tactical status indicators (emerald for valid authentication, red for security/tamper alerts, cyan for operational telemetry).

## 2. Preserved Design System & Tokens
- **Surface Hierarchy**:
  - Base Canvas: `bg-zinc-950` (`#09090b`)
  - Elevated Surfaces / Cards: `bg-zinc-900` (`#18181b`)
  - Subtle Hover States: `bg-zinc-800/50` (`#27272a`)
- **Border & Radius Treatment**:
  - Borders: `border border-zinc-800`
  - Radius: `rounded-lg` (cards) and `rounded-md` (buttons/inputs)
- **Typography System**:
  - Primary UI Sans: `Inter` / System Sans for page headings, navigation, form labels, and body text.
  - Technical Mono: `JetBrains Mono` / `ui-monospace` for `CWAV` magic bytes, protocol IDs, byte lengths, salt/nonce hex values, and metric figures.
- **Color Palette & Status Indicators**:
  - Emerald (`text-emerald-400`, `bg-emerald-500/10`, `border-emerald-500/30`): Authenticated payload, valid WAV, success state.
  - Rose / Red (`text-rose-400`, `bg-rose-500/10`, `border-rose-500/30`): Authentication failure, tampered audio, capacity overflow.
  - Cyan (`text-cyan-400`, `bg-cyan-500/10`, `border-cyan-500/30`): Telemetry metrics (SNR dB, RMS error, sample count).
  - Amber / Yellow (`text-amber-400`, `bg-amber-500/10`): Warning states, high capacity utilization (>80%).

## 3. Adapted Patterns vs Custom Components
- **Preserved Patterns**:
  - Dark top navigation header with active indicator highlights and quick status badge (`CWAV v1 Online`).
  - Dual-pane split workspace layout (Main operational form on left, live telemetry summary on right).
  - Compact badge pill tags for protocol version (`CWAV v1`), algorithm (`scrypt + AES-256-GCM`), and audio metadata.
- **Replaced Parts**:
  - Server incident logs and generic infrastructure metrics replaced with CryptoWave audio steganography telemetry (capacity utilization, SNR dB, RMS error, changed samples/bits).
  - Static chart placeholders replaced with real-time Canvas audio visualizers.
- **Custom Components Built**:
  - `WaveformVisualizer.tsx`: Canvas rendering 16-bit PCM audio sample amplitude waveform with timeline scrubbing.
  - `SpectrogramVisualizer.tsx`: Canvas frequency intensity spectrogram visualizer.
  - `EncodeForm.tsx` & `EncodeSummary.tsx`: Dual-pane encoding workspace with instant capacity checking and stego WAV file download trigger.
  - `DecodeForm.tsx`: Inverse stego extraction form with step-by-step pipeline state indicators and authenticated plaintext presentation.
  - `AttackLab.tsx`: Interactive attack matrix runner (Wrong Password, Bit-flipping, Amplitude Gain Scaling).
