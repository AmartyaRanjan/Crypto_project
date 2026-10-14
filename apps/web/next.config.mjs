/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cryptowave/crypto", "@cryptowave/protocol", "@cryptowave/audio"],
};

export default nextConfig;
