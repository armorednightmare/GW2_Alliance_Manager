/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverExternalPackages: ["@prisma/client", "pg", "@prisma/adapter-pg"],
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
  async redirects() {
    return [
      {
        source: '/:path*',
        destination: 'https://frog-alliance-manager--frog-alliance-manager.europe-west4.hosted.app/:path*',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
