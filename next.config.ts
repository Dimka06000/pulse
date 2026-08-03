import type { NextConfig } from 'next';
import path from 'path';

const config: NextConfig = {
  // Self-contained server bundle for the sovereign cluster: Next traces only the
  // files actually reached and emits .next/standalone, so the runtime image
  // carries no node_modules of its own. Harmless anywhere else — `next start`
  // and `next dev` ignore it.
  output: 'standalone',
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
