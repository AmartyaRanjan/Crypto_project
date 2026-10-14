const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface AudioMetricsResponse {
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

export interface EncodeResponse {
  blob: Blob;
  filename: string;
  metrics: AudioMetricsResponse | null;
}

export interface DecodeSuccessResponse {
  success: true;
  message: string;
  packetInfo: {
    version: number;
    kdf: string;
    cipher: string;
    payloadSize: number;
    sampleRate: number;
    channels: number;
    lsbDepth: number;
  };
}

export interface AnalyzeSuccessResponse {
  success: true;
  audioProperties: {
    sampleRate: number;
    channels: number;
    bitsPerSample: number;
    lsbDepth: number;
  };
  metrics: AudioMetricsResponse;
}

export interface ApiErrorResponse {
  error: string;
}

export async function checkBackendHealth(): Promise<{ status: string; service: string } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: "GET" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function encodeAudioApi(
  file: File,
  message: string,
  password: string,
  lsbDepth: 1 | 2 = 1
): Promise<EncodeResponse> {
  const formData = new FormData();
  formData.append("audio", file);
  formData.append("message", message);
  formData.append("password", password);
  formData.append("lsbDepth", lsbDepth.toString());

  const res = await fetch(`${API_BASE_URL}/api/v1/encode`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let errorMsg = `Server returned status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch {}
    throw new Error(errorMsg);
  }

  const metricsHeader = res.headers.get("X-CryptoWave-Metrics");
  let metrics: AudioMetricsResponse | null = null;
  if (metricsHeader) {
    try {
      metrics = JSON.parse(metricsHeader);
    } catch {}
  }

  const blob = await res.blob();
  const contentDisp = res.headers.get("Content-Disposition");
  let filename = "stego.wav";
  if (contentDisp && contentDisp.includes("filename=")) {
    filename = contentDisp.split("filename=")[1].replace(/"/g, "").trim();
  }

  return { blob, filename, metrics };
}

export async function decodeAudioApi(
  stegoFile: File,
  password: string,
  lsbDepth: 1 | 2 = 1
): Promise<DecodeSuccessResponse> {
  const formData = new FormData();
  formData.append("stegoAudio", stegoFile);
  formData.append("password", password);
  formData.append("lsbDepth", lsbDepth.toString());

  const res = await fetch(`${API_BASE_URL}/api/v1/decode`, {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Decode failed with status ${res.status}`);
  }

  return json as DecodeSuccessResponse;
}

export async function analyzeAudioApi(
  originalFile: File,
  stegoFile: File,
  lsbDepth: 1 | 2 = 1
): Promise<AnalyzeSuccessResponse> {
  const formData = new FormData();
  formData.append("originalAudio", originalFile);
  formData.append("stegoAudio", stegoFile);
  formData.append("lsbDepth", lsbDepth.toString());

  const res = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Analysis failed with status ${res.status}`);
  }

  return json as AnalyzeSuccessResponse;
}
