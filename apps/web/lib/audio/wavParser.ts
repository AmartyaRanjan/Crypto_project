export interface ClientWavInfo {
  filename: string;
  sizeBytes: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  totalSamples: number;
  durationSeconds: number;
  capacityBytes: number; // For 1-bit LSB
  samples?: Int16Array;
}

export async function parseClientWav(file: File): Promise<ClientWavInfo> {
  const buffer = new Uint8Array(await file.arrayBuffer());

  if (buffer.length < 44) {
    throw new Error("Invalid WAV file: Minimum length is 44 bytes");
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const riffMagic = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
  if (riffMagic !== "RIFF") {
    throw new Error("Invalid file header: Missing RIFF magic signature");
  }

  const waveMagic = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]);
  if (waveMagic !== "WAVE") {
    throw new Error("Invalid file header: Missing WAVE format signature");
  }

  let offset = 12;
  let audioFormat = 0;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let rawPcmBytes: Uint8Array | null = null;

  while (offset + 8 <= buffer.length) {
    const chunkId = String.fromCharCode(
      buffer[offset],
      buffer[offset + 1],
      buffer[offset + 2],
      buffer[offset + 3]
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === "fmt ") {
      audioFormat = view.getUint16(offset + 8, true);
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkId === "data") {
      const dataOffset = offset + 8;
      rawPcmBytes = buffer.subarray(dataOffset, Math.min(buffer.length, dataOffset + chunkSize));
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  if (audioFormat !== 1) {
    throw new Error(`Unsupported audio format: ${audioFormat} (Only uncompressed PCM = 1 supported)`);
  }
  if (bitsPerSample !== 16) {
    throw new Error(`Unsupported PCM bit depth: ${bitsPerSample}-bit (Only 16-bit PCM supported)`);
  }
  if (!rawPcmBytes) {
    throw new Error("Invalid WAV file: missing data chunk");
  }

  const totalSamples = Math.floor(rawPcmBytes.length / 2);
  const pcmView = new DataView(rawPcmBytes.buffer, rawPcmBytes.byteOffset, rawPcmBytes.byteLength);
  const samples = new Int16Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    samples[i] = pcmView.getInt16(i * 2, true);
  }

  const durationSeconds = totalSamples / (sampleRate * channels);
  const capacityBytes = Math.floor(totalSamples / 8);

  return {
    filename: file.name,
    sizeBytes: file.size,
    sampleRate,
    channels,
    bitsPerSample,
    totalSamples,
    durationSeconds: Number(durationSeconds.toFixed(2)),
    capacityBytes,
    samples,
  };
}
