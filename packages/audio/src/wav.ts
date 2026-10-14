export interface WavAudio {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  samples: Int16Array;
}

export function parseWav(buffer: Uint8Array): WavAudio {
  if (buffer.length < 44) {
    throw new Error(`Invalid WAV file: minimum length is 44 bytes, got ${buffer.length}`);
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Validate "RIFF" header
  const riffMagic = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
  if (riffMagic !== "RIFF") {
    throw new Error(`Invalid WAV header: missing RIFF magic bytes, found '${riffMagic}'`);
  }

  // Validate "WAVE" format
  const waveMagic = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]);
  if (waveMagic !== "WAVE") {
    throw new Error(`Invalid WAV header: missing WAVE format bytes, found '${waveMagic}'`);
  }

  let offset = 12;
  let audioFormat = 0;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let samples: Int16Array | null = null;

  while (offset + 8 <= buffer.length) {
    const chunkId = String.fromCharCode(
      buffer[offset],
      buffer[offset + 1],
      buffer[offset + 2],
      buffer[offset + 3]
    );
    const chunkSize = view.getUint32(offset + 4, true); // Little-endian

    if (chunkId === "fmt ") {
      if (chunkSize < 16) {
        throw new Error(`Invalid fmt chunk size: expected at least 16 bytes, got ${chunkSize}`);
      }
      audioFormat = view.getUint16(offset + 8, true);
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);

      if (audioFormat !== 1) {
        throw new Error(`Unsupported WAV audio format: ${audioFormat} (only uncompressed PCM = 1 supported)`);
      }
      if (bitsPerSample !== 16) {
        throw new Error(`Unsupported PCM bit depth: ${bitsPerSample}-bit (only 16-bit PCM supported)`);
      }
      if (channels !== 1 && channels !== 2) {
        throw new Error(`Unsupported channel count: ${channels} (only mono=1 or stereo=2 supported)`);
      }
    } else if (chunkId === "data") {
      const dataOffset = offset + 8;
      if (dataOffset + chunkSize > buffer.length) {
        throw new Error(`Corrupted data chunk: chunk size ${chunkSize} extends beyond file size ${buffer.length}`);
      }
      const pcmBytes = buffer.subarray(dataOffset, dataOffset + chunkSize);
      
      // Convert raw byte array (Little Endian) to Int16Array
      const sampleCount = Math.floor(pcmBytes.length / 2);
      samples = new Int16Array(sampleCount);
      const pcmView = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength);
      for (let i = 0; i < sampleCount; i++) {
        samples[i] = pcmView.getInt16(i * 2, true);
      }
    }

    // Move to next chunk (RIFF chunks are padded to 2-byte boundaries)
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  if (!samples) {
    throw new Error("Invalid WAV file: missing data chunk");
  }
  if (sampleRate === 0 || channels === 0 || bitsPerSample === 0) {
    throw new Error("Invalid WAV file: missing or invalid fmt chunk");
  }

  return {
    sampleRate,
    channels,
    bitsPerSample,
    samples,
  };
}

export function writeWav(audio: WavAudio): Uint8Array {
  const { sampleRate, channels, bitsPerSample, samples } = audio;

  if (bitsPerSample !== 16) {
    throw new Error(`Only 16-bit PCM supported for writing WAV files, got ${bitsPerSample}`);
  }

  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const totalFileSize = headerSize + dataSize;

  const buffer = new Uint8Array(totalFileSize);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // 1. "RIFF" chunk descriptor
  buffer.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, totalFileSize - 8, true); // File size minus 8
  buffer.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // 2. "fmt " sub-chunk
  buffer.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, channels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // 3. "data" sub-chunk
  buffer.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Write Int16 sample array as Little-Endian PCM
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, samples[i], true);
    offset += 2;
  }

  return buffer;
}
