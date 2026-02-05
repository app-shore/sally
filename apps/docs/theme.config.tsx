import { useConfig } from 'nextra-theme-docs';

const config = {
  // Logo in minimal navbar
  logo: <span className="font-bold">🚛 SALLY Developer Portal</span>,

  // Project links
  project: {
    link: 'https://github.com/your-org/sally'
  },
  docsRepositoryBase: 'https://github.com/your-org/sally/tree/main/apps/docs',

  // Black, white, and gray color scheme
  primaryHue: 0,
  primarySaturation: 0,

  // Dark mode configuration with next-themes
  darkMode: true,
  nextThemes: {
    defaultTheme: 'dark',
    storageKey: 'sally-theme'
  },

  // Sidebar configuration
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true
  },

  // Table of Contents configuration
  toc: {
    float: true,
    title: 'On This Page'
  },

  // Footer
  footer: {
    text: (
      <span>
        {new Date().getFullYear()} © SALLY - Your Fleet Operations Assistant
      </span>
    )
  },

  // Head meta tags
  head: () => {
    const { title } = useConfig();
    return (
      <>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:title" content={title || 'SALLY Developer Portal'} />
        <meta property="og:description" content="API documentation for SALLY Fleet Operations Assistant" />
        <link rel="icon" href="/favicon.ico" />
      </>
    );
  },

  // Navigation
  navigation: {
    prev: true,
    next: true
  },

  // Search configuration
  search: {
    placeholder: 'Search documentation...'
  }
};

export default config;
