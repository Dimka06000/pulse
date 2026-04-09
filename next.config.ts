import type { NextConfig } from 'next';
import path from 'path';

const config: NextConfig = {
  transpilePackages: ['@oikos/coaching'],
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // Resolve @oikos/coaching to local source (for Vercel standalone deploy)
    // Try local monorepo path first, then bundled copy for Vercel
    const fs = require('fs');
    const monorepoPath = path.resolve(__dirname, '../coaching/src');
    const bundledPath = path.resolve(__dirname, 'coaching-src');
    config.resolve.alias['@oikos/coaching'] = fs.existsSync(monorepoPath) ? monorepoPath : bundledPath;
    config.resolve.alias['@oikos/core'] = path.resolve(__dirname, 'src/lib/stubs/oikos-core.ts');
    // Resolve .js imports to .ts source files
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default config;
