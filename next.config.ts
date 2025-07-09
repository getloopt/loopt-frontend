/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Fix for Radix UI ESM compatibility
  transpilePackages: [
    '@radix-ui/react-id',
    '@radix-ui/react-dialog',
    '@radix-ui/react-alert-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-slot',
    '@radix-ui/react-separator',
    '@radix-ui/react-tooltip',
    '@radix-ui/react-checkbox',
    '@radix-ui/react-label',
    '@radix-ui/react-progress'
  ],
  
  // Webpack configuration to handle ESM modules
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Fix for __webpack_require__.t issue
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });
    
    return config;
  },
  
  // Add headers for better security
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
}

export default nextConfig;
