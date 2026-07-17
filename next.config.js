/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.shields.io' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com', pathname: '/arukurmi/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            // Only meaningful over HTTPS; browsers ignore it on localhost.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          {
            // The site never needs these powerful APIs — deny them outright.
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
