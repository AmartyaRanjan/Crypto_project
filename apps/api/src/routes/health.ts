import { Elysia } from "elysia";

export const healthRoute = new Elysia().get("/health", () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
  service: "CryptoWave API",
  version: "1.0.0",
}));
