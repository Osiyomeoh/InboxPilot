/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: [],
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL ?? 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.API_WS_URL ?? 'ws://localhost:3001',
  },
};

export default config;
