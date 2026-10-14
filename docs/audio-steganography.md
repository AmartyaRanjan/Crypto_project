# Audio Steganography & Distortion Metrics

CryptoWave embeds hidden data in 16-bit PCM WAV audio using Least Significant Bit (LSB) steganography.

## 1-Bit LSB Embedding
- Each 16-bit audio sample holds 1 payload bit in bit position 0.
- Sample mask: `(sample & 0xFFFE) | bit`.
- Peak amplitude deviation: $\pm 1$ quantum count out of $\pm 32,767$.
- Audio Quality: Signal-to-Noise Ratio (SNR) $> 100$ dB for typical 16-bit audio, rendering steganographic changes completely imperceptible to human hearing.

## 2-Bit LSB Embedding (Experimental)
- Each sample holds 2 payload bits in bit positions 0-1.
- Sample mask: `(sample & 0xFFFC) | bits`.
- Doubles payload capacity, with minimal SNR impact (SNR $> 90$ dB).

## Audio Metrics
- **RMS Error**: $\sqrt{\frac{1}{N} \sum (x_i - y_i)^2}$
- **SNR (dB)**: $10 \log_{10} \frac{\sum x_i^2}{\sum (x_i - y_i)^2}$
- **Changed Samples / Bits**: Tracks exact count and percentage of modified samples and bit positions.

## Fragility Note
LSB steganography is fragile against lossy audio compression (MP3, AAC, OGG), amplitude gain scaling, and sample rate conversion. It requires lossless WAV transmission.
