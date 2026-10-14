export function calculateCapacity(sampleCount: number, lsbDepth: 1 | 2 = 1): number {
  return Math.floor((sampleCount * lsbDepth) / 8);
}

export function embedLSB(
  samples: Int16Array,
  payload: Uint8Array,
  lsbDepth: 1 | 2 = 1
): Int16Array {
  const capacity = calculateCapacity(samples.length, lsbDepth);
  if (payload.length > capacity) {
    throw new Error(
      `Payload size (${payload.length} bytes) exceeds audio capacity (${capacity} bytes)`
    );
  }

  // Create a copy of sample data to prevent mutating input array
  const stegoSamples = new Int16Array(samples);
  const totalBits = payload.length * 8;

  if (lsbDepth === 1) {
    let sampleIdx = 0;
    for (let byteIdx = 0; byteIdx < payload.length; byteIdx++) {
      const byteVal = payload[byteIdx];
      for (let bitIdx = 7; bitIdx >= 0; bitIdx--) {
        const bit = (byteVal >> bitIdx) & 1;
        // Mask out bit 0 and insert payload bit
        stegoSamples[sampleIdx] = (stegoSamples[sampleIdx] & ~1) | bit;
        sampleIdx++;
      }
    }
  } else if (lsbDepth === 2) {
    let sampleIdx = 0;
    for (let byteIdx = 0; byteIdx < payload.length; byteIdx++) {
      const byteVal = payload[byteIdx];
      // 4 two-bit chunks per byte
      for (let shift = 6; shift >= 0; shift -= 2) {
        const bits = (byteVal >> shift) & 0x03;
        // Mask out lowest 2 bits and insert 2-bit chunk
        stegoSamples[sampleIdx] = (stegoSamples[sampleIdx] & ~3) | bits;
        sampleIdx++;
      }
    }
  } else {
    throw new Error(`Unsupported LSB depth: ${lsbDepth}`);
  }

  return stegoSamples;
}

export function extractLSB(
  samples: Int16Array,
  payloadLengthBytes: number,
  lsbDepth: 1 | 2 = 1
): Uint8Array {
  const maxCapacity = calculateCapacity(samples.length, lsbDepth);
  if (payloadLengthBytes > maxCapacity) {
    throw new Error(
      `Requested payload length (${payloadLengthBytes} bytes) exceeds available carrier capacity (${maxCapacity} bytes)`
    );
  }

  const result = new Uint8Array(payloadLengthBytes);

  if (lsbDepth === 1) {
    let sampleIdx = 0;
    for (let byteIdx = 0; byteIdx < payloadLengthBytes; byteIdx++) {
      let byteVal = 0;
      for (let bitIdx = 7; bitIdx >= 0; bitIdx--) {
        const bit = samples[sampleIdx] & 1;
        byteVal |= bit << bitIdx;
        sampleIdx++;
      }
      result[byteIdx] = byteVal;
    }
  } else if (lsbDepth === 2) {
    let sampleIdx = 0;
    for (let byteIdx = 0; byteIdx < payloadLengthBytes; byteIdx++) {
      let byteVal = 0;
      for (let shift = 6; shift >= 0; shift -= 2) {
        const bits = samples[sampleIdx] & 0x03;
        byteVal |= bits << shift;
        sampleIdx++;
      }
      result[byteIdx] = byteVal;
    }
  } else {
    throw new Error(`Unsupported LSB depth: ${lsbDepth}`);
  }

  return result;
}

export function extractLSBHeader(
  samples: Int16Array,
  lsbDepth: 1 | 2 = 1
): Uint8Array {
  // HEADER_SIZE = 32 bytes
  return extractLSB(samples, 32, lsbDepth);
}
