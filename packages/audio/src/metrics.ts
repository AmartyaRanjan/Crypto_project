import { calculateCapacity } from "./lsb";

export interface AudioMetrics {
  carrierSize: number;
  stegoSize: number;
  sampleCount: number;
  payloadSize: number;
  capacity: number;
  utilizationPercent: number;
  rmsError: number;
  snrDb: number;
  changedSamples: number;
  changedSamplesPercent: number;
  changedBits: number;
}

export function calculateMetrics(
  originalSamples: Int16Array,
  stegoSamples: Int16Array,
  payloadSize: number,
  lsbDepth: 1 | 2 = 1,
  carrierHeaderBytes = 44
): AudioMetrics {
  if (originalSamples.length !== stegoSamples.length) {
    throw new Error("Sample count mismatch between original and stego audio");
  }

  const sampleCount = originalSamples.length;
  const capacity = calculateCapacity(sampleCount, lsbDepth);
  const utilizationPercent = capacity > 0 ? (payloadSize / capacity) * 100 : 0;

  const dataSizeBytes = sampleCount * 2;
  const carrierSize = carrierHeaderBytes + dataSizeBytes;
  const stegoSize = carrierSize;

  let sumSquareError = 0;
  let sumSquareSignal = 0;
  let changedSamples = 0;
  let changedBits = 0;

  for (let i = 0; i < sampleCount; i++) {
    const orig = originalSamples[i];
    const stego = stegoSamples[i];
    const diff = stego - orig;

    sumSquareError += diff * diff;
    sumSquareSignal += orig * orig;

    if (diff !== 0) {
      changedSamples++;
      
      // Calculate differing bits in 16-bit integer
      let xor = (orig ^ stego) & 0xffff;
      while (xor > 0) {
        if (xor & 1) changedBits++;
        xor >>= 1;
      }
    }
  }

  const rmsError = Math.sqrt(sumSquareError / sampleCount);

  // SNR (dB) = 10 * log10(sumSquareSignal / sumSquareError)
  let snrDb = Number.POSITIVE_INFINITY;
  if (sumSquareError > 0 && sumSquareSignal > 0) {
    snrDb = 10 * Math.log10(sumSquareSignal / sumSquareError);
  } else if (sumSquareError === 0) {
    snrDb = 999; // Perfect match
  }

  const changedSamplesPercent = (changedSamples / sampleCount) * 100;

  return {
    carrierSize,
    stegoSize,
    sampleCount,
    payloadSize,
    capacity,
    utilizationPercent: Number(utilizationPercent.toFixed(2)),
    rmsError: Number(rmsError.toFixed(6)),
    snrDb: Number(snrDb.toFixed(2)),
    changedSamples,
    changedSamplesPercent: Number(changedSamplesPercent.toFixed(2)),
    changedBits,
  };
}
