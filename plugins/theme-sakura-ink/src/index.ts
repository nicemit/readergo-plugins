/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin, PluginContext } from '@readergo/plugin-sdk';

const SHIPPORI = {
  id: 'shippori-mincho',
  name: 'Shippori Mincho',
  family: "'Shippori Mincho', 'Georgia', serif",
  category: 'serif' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;700&display=swap',
  targets: ['display', 'editor'] as const,
};

const NOTO_SANS = {
  id: 'noto-sans-jp-ui',
  name: 'Noto Sans',
  family: "'Noto Sans', system-ui, sans-serif",
  category: 'sans' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap',
  targets: ['body', 'all'] as const,
};

const THEME = {
  id: 'sakura-ink',
  name: 'Sakura Ink',
  type: 'light' as const,
  author: 'ReaderGo Studio',
  description: 'Paper-white ink wash with soft sakura pink signals and scholarly serif headings.',
  colors: {
    background: '0 0% 98%',
    foreground: '220 20% 16%',
    card: '0 0% 100%',
    cardForeground: '220 20% 16%',
    border: '340 12% 88%',
    primary: '340 55% 48%',
    primaryForeground: '0 0% 100%',
    secondary: '340 20% 95%',
    secondaryForeground: '220 18% 22%',
    muted: '220 10% 95%',
    mutedForeground: '220 8% 42%',
    accent: '200 35% 42%',
    accentForeground: '0 0% 100%',
    destructive: '4 70% 46%',
    destructiveForeground: '0 0% 100%',
    success: '152 40% 36%',
    successForeground: '0 0% 100%',
    warning: '32 70% 42%',
    warningForeground: '0 0% 100%',
    info: '200 40% 42%',
    infoForeground: '0 0% 100%',
    input: '0 0% 97%',
    ring: '340 55% 48%',
    heading1: '340 50% 38%',
    heading2: '220 25% 28%',
    heading3: '200 30% 36%',
  },
  fonts: { display: SHIPPORI, body: NOTO_SANS, editor: SHIPPORI, mono: NOTO_SANS },
  materials: {
    radius: '0.4rem',
    radius2xl: '0.75rem',
    surfaceBlur: '0px',
    shadowMd: '0 2px 10px rgb(40 20 30 / 0.06)',
    insetShadow: 'inset 0 1px 2px rgb(40 20 30 / 0.05)',
  },
  stylesheet: `
    background-image:
      radial-gradient(ellipse at 90% 5%, rgb(255 180 200 / 0.18), transparent 40%),
      radial-gradient(ellipse at 10% 90%, rgb(180 210 230 / 0.12), transparent 45%);
  `,
  stylesheetScoped: true,
};

export const SakuraInkThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.sakura-ink',
    name: 'Sakura Ink',
    version: '1.0.0',
    description: 'Light ink-wash workspace with cherry blossom accents and Shippori Mincho headings.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },
  async activate(context: PluginContext) {
    await context.registerCapability('theme-provider', { getThemes: () => [THEME] });
    await context.registerCapability('font-provider', { getFonts: () => [SHIPPORI, NOTO_SANS] });
  },
  deactivate() {},
};

export default SakuraInkThemePlugin;
