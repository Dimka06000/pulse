import type { NextConfig } from 'next';
import path from 'path';

const config: NextConfig = {
  transpilePackages: ['@oikos/coaching'],
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // Resolve @oikos/coaching to local bundled copy (standalone, no monorepo)
    config.resolve.alias['@oikos/coaching'] = path.resolve(__dirname, 'coaching-src');
    config.resolve.alias['@oikos/core'] = path.resolve(__dirname, 'src/lib/stubs/oikos-core.ts');
    // Resolve .js imports to .ts source files
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default config;
