/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin, PluginContext } from '@readergo/plugin-sdk';

const BASKERVILLE = {
  id: 'libre-baskerville',
  name: 'Libre Baskerville',
  family: "'Libre Baskerville', 'Georgia', serif",
  category: 'serif' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap',
  targets: ['display', 'editor'] as const,
};

const IBM_PLEX = {
  id: 'ibm-plex-sans-news',
  name: 'IBM Plex Sans',
  family: "'IBM Plex Sans', system-ui, sans-serif",
  category: 'sans' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
  targets: ['body', 'all'] as const,
};

const IBM_MONO = {
  id: 'ibm-plex-mono-news',
  name: 'IBM Plex Mono',
  family: "'IBM Plex Mono', ui-monospace, monospace",
  category: 'mono' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap',
  targets: ['mono'] as const,
};

const THEME = {
  id: 'newsprint',
  name: 'Newsprint',
  type: 'light' as const,
  author: 'ReaderGo Studio',
  description: 'Broadsheet monochrome - India ink on cold paper, hairline borders, zero chrome glow.',
  colors: {
    background: '40 10% 96%',
    foreground: '0 0% 8%',
    card: '0 0% 100%',
    cardForeground: '0 0% 8%',
    border: '0 0% 78%',
    primary: '0 0% 10%',
    primaryForeground: '0 0% 98%',
    secondary: '40 8% 92%',
    secondaryForeground: '0 0% 12%',
    muted: '40 6% 93%',
    mutedForeground: '0 0% 38%',
    accent: '0 0% 22%',
    accentForeground: '0 0% 98%',
    destructive: '0 0% 20%',
    destructiveForeground: '0 0% 100%',
    success: '0 0% 25%',
    successForeground: '0 0% 100%',
    warning: '0 0% 30%',
    warningForeground: '0 0% 100%',
    info: '0 0% 28%',
    infoForeground: '0 0% 100%',
    input: '0 0% 100%',
    ring: '0 0% 10%',
    heading1: '0 0% 5%',
    heading2: '0 0% 12%',
    heading3: '0 0% 18%',
  },
  fonts: { display: BASKERVILLE, body: IBM_PLEX, editor: BASKERVILLE, mono: IBM_MONO },
  materials: {
    radius: '0.15rem',
    radiusSm: '0.1rem',
    radiusMd: '0.12rem',
    radiusLg: '0.15rem',
    radiusXl: '0.2rem',
    radius2xl: '0.25rem',
    surfaceBlur: '0px',
    shadowSm: 'none',
    shadowMd: '0 1px 0 rgb(0 0 0 / 0.08)',
    shadowLg: '0 2px 0 rgb(0 0 0 / 0.06)',
    shadowXl: '0 3px 0 rgb(0 0 0 / 0.05)',
    insetHighlight: 'none',
    insetShadow: 'none',
    borderWidth: '1px',
  },
  stylesheet: `
    background-image:
      repeating-linear-gradient(
        0deg,
        rgb(0 0 0 / 0.015) 0 1px,
        transparent 1px 4px
      );
  `,
  stylesheetScoped: true,
};

export const NewsprintThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.newsprint',
    name: 'Newsprint',
    version: '1.0.0',
    description: 'Stark editorial monochrome with hairline rules and Libre Baskerville / IBM Plex typography.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },
  async activate(context: PluginContext) {
    await context.registerCapability('theme-provider', { getThemes: () => [THEME] });
    await context.registerCapability('font-provider', {
      getFonts: () => [BASKERVILLE, IBM_PLEX, IBM_MONO],
    });
  },
  deactivate() {},
};

export default NewsprintThemePlugin;
