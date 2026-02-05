const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true,
  flexsearch: {
    codeblocks: true
  }
});

module.exports = withNextra({
  output: 'export',
  images: {
    unoptimized: true
  },
  basePath: '',
  trailingSlash: true,
  experimental: {
    optimizeCss: true
  },
  async redirects() {
    return [
      {
        source: '/api-reference',
        destination: '/api-reference/index',
        permanent: true
      }
    ];
  }
});
