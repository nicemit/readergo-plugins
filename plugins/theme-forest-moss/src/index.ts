/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin, PluginContext } from '@readergo/plugin-sdk';

const LITERATA = {
  id: 'literata-forest',
  name: 'Literata',
  family: "'Literata', 'Georgia', serif",
  category: 'serif' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;0,7..72,700;1,7..72,400&display=swap',
  targets: ['display', 'editor'] as const,
};

const SOURCE_SANS = {
  id: 'source-sans-forest',
  name: 'Source Sans 3',
  family: "'Source Sans 3', system-ui, sans-serif",
  category: 'sans' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap',
  targets: ['body', 'all'] as const,
};

const THEME = {
  id: 'forest-moss',
  name: 'Forest Moss',
  type: 'dark' as const,
  author: 'ReaderGo Studio',
  description: 'Under-canopy greens with lichen yellow accents for long reading sessions.',
  colors: {
    background: '140 22% 9%',
    foreground: '90 18% 90%',
    card: '140 18% 13%',
    cardForeground: '90 18% 90%',
    border: '140 14% 22%',
    primary: '118 42% 48%',
    primaryForeground: '140 30% 6%',
    secondary: '140 14% 17%',
    secondaryForeground: '90 14% 84%',
    muted: '140 12% 15%',
    mutedForeground: '120 10% 55%',
    accent: '72 45% 48%',
    accentForeground: '140 30% 6%',
    destructive: '8 65% 48%',
    destructiveForeground: '0 0% 100%',
    success: '118 42% 42%',
    successForeground: '0 0% 100%',
    warning: '48 70% 48%',
    warningForeground: '140 30% 6%',
    info: '170 40% 45%',
    infoForeground: '0 0% 100%',
    input: '140 16% 11%',
    ring: '118 42% 48%',
    heading1: '90 40% 72%',
    heading2: '118 35% 66%',
    heading3: '72 35% 62%',
  },
  fonts: { display: LITERATA, body: SOURCE_SANS, editor: LITERATA, mono: SOURCE_SANS },
  materials: {
    radius: '0.6rem',
    radius2xl: '1rem',
    surfaceBlur: '0px',
    shadowMd: '0 6px 20px rgb(0 20 10 / 0.45)',
  },
  stylesheet: `
    background-image:
      radial-gradient(ellipse at 15% 20%, rgb(60 120 70 / 0.18), transparent 45%),
      radial-gradient(ellipse at 85% 80%, rgb(20 40 20 / 0.35), transparent 50%);
  `,
  stylesheetScoped: true,
};

export const ForestMossThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.forest-moss',
    name: 'Forest Moss',
    version: '1.0.0',
    description: 'Canopy-dark greens with lichen accents and Literata reading typography.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },
  async activate(context: PluginContext) {
    await context.registerCapability('theme-provider', { getThemes: () => [THEME] });
    await context.registerCapability('font-provider', { getFonts: () => [LITERATA, SOURCE_SANS] });
  },
  deactivate() {},
};

export default ForestMossThemePlugin;
