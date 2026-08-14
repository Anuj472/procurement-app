import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  allowedDevOrigins: ['3000-01kzzgh5wet66khmkwd8qwx02x.cloudspaces.litng.ai', 'localhost:3000'],
  experimental: {
    serverActions: {
      allowedOrigins: ['3000-01kzzgh5wet66khmkwd8qwx02x.cloudspaces.litng.ai', 'localhost:3000']
    }
  }
};
export default nextConfig;