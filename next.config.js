const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const isStaticExport = process.env.STATIC_EXPORT === 'true' || process.env.MOBILE_BUILD === 'true';
const githubPagesRepo = process.env.GITHUB_PAGES_REPO || '';
const githubPagesBasePath = githubPagesRepo ? `/${githubPagesRepo}` : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Enable static export for mobile and static web builds
  output: isStaticExport ? 'export' : undefined,
  
  // Trailing slash is needed for static export
  trailingSlash: isStaticExport,

  // GitHub Pages project sites are served under /<repo-name>
  basePath: githubPagesBasePath,
  assetPrefix: githubPagesBasePath || undefined,
  
  // Images configuration
  images: {
    unoptimized: isStaticExport, // Required for static export
    domains: [],
  },
  
  // Environment variables
  env: {
    APP_VERSION: process.env.npm_package_version || '1.0.0',
    IS_MOBILE: process.env.MOBILE_BUILD === 'true' ? 'true' : 'false',
  },
  
  // Headers for security and PWA
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
