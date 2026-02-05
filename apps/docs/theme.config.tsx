import { useConfig } from 'nextra-theme-docs';

const config = {
  logo: <span className="font-bold">SALLY Developer Portal</span>,
  project: {
    link: 'https://github.com/your-org/sally'
  },
  docsRepositoryBase: 'https://github.com/your-org/sally/tree/main/apps/docs',

  primaryHue: 0,
  primarySaturation: 0,

  darkMode: true,
  nextThemes: {
    defaultTheme: 'dark'
  },

  footer: {
    text: (
      <span>
        {new Date().getFullYear()} © SALLY - Your Fleet Operations Assistant
      </span>
    )
  },

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

  navigation: {
    prev: true,
    next: true
  },

  search: {
    placeholder: 'Search documentation...'
  }
};

export default config;
