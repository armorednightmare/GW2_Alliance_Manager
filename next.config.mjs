import { execSync } from "child_process";

let commitHash = "unknown";
let buildTime = new Date().toISOString();

try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  // Git command fallback if git is not installed/initialized
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_GIT_COMMIT_HASH: commitHash,
    NEXT_PUBLIC_BUILD_DATE: buildTime,
  },
};

export default nextConfig;
