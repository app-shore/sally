import nextra from 'nextra'

const isGithubPages = process.env.GITHUB_PAGES === 'true'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true
})

export default withNextra({
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  ...(isGithubPages && {
    basePath: '/sally',
    assetPrefix: '/sally/'
  })
})
