import { useConfig } from 'nextra-theme-docs';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const config = {
  // Logo in minimal navbar
  logo: <span className="font-bold">SALLY Developer Portal</span>,

  // Project links
  project: {
    link: 'https://github.com/ajaynarang/sally'
  },
  docsRepositoryBase: 'https://github.com/ajaynarang/sally/tree/main/apps/docs',

  // Black, white, and gray color scheme
  primaryHue: 0,
  primarySaturation: 0,

  // Force light mode only -- no light/dark toggle
  darkMode: false,
  nextThemes: {
    defaultTheme: 'light',
    forcedTheme: 'light',
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

  // Extra content in navbar — "Back to SALLY" link
  navbar: {
    extraContent: (
      <a
        href={APP_URL}
        className="nx-text-sm nx-text-gray-500 hover:nx-text-gray-900 nx-transition-colors nx-flex nx-items-center nx-gap-1"
      >
        &larr; Back to SALLY
      </a>
    )
  },

  // Footer
  footer: {
    text: (
      <span>
        {new Date().getFullYear()} &copy; SALLY - Your Fleet Operations Assistant
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

  // Disable top-level navigation in navbar (sidebar-only navigation)
  navigation: false,

  // Search configuration
  search: {
    placeholder: 'Search documentation...'
  }
};

export default config;
