/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin, PluginContext } from '@readergo/plugin-sdk';

const DM_SANS = {
  id: 'dm-sans-abyss',
  name: 'DM Sans',
  family: "'DM Sans', system-ui, sans-serif",
  category: 'sans' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&display=swap',
  targets: ['all'] as const,
};

const THEME = {
  id: 'abyss-teal',
  name: 'Abyss Teal',
  type: 'dark' as const,
  author: 'ReaderGo Studio',
  description: 'Deep ocean trench palette with teal phosphor signals and soft cyan focus rings.',
  colors: {
    background: '198 40% 7%',
    foreground: '186 35% 92%',
    card: '198 32% 11%',
    cardForeground: '186 35% 92%',
    border: '196 24% 22%',
    primary: '174 62% 48%',
    primaryForeground: '198 40% 6%',
    secondary: '198 28% 15%',
    secondaryForeground: '186 30% 86%',
    muted: '198 26% 13%',
    mutedForeground: '190 14% 55%',
    accent: '186 70% 52%',
    accentForeground: '198 40% 6%',
    destructive: '4 70% 52%',
    destructiveForeground: '0 0% 100%',
    success: '160 50% 42%',
    successForeground: '0 0% 100%',
    warning: '38 80% 52%',
    warningForeground: '198 40% 6%',
    info: '186 70% 52%',
    infoForeground: '198 40% 6%',
    input: '198 30% 10%',
    ring: '174 62% 48%',
    heading1: '174 70% 68%',
    heading2: '186 55% 66%',
    heading3: '190 40% 64%',
  },
  fonts: { display: DM_SANS, body: DM_SANS, editor: DM_SANS, mono: DM_SANS },
  materials: {
    radius: '0.55rem',
    radius2xl: '0.9rem',
    surfaceBlur: '8px',
    shadowMd: '0 4px 18px rgb(0 40 50 / 0.45)',
  },
};

export const AbyssTealThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.abyss-teal',
    name: 'Abyss Teal',
    version: '1.0.0',
    description: 'Deep ocean workspace with teal phosphor accents and calm DM Sans typography.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },
  async activate(context: PluginContext) {
    await context.registerCapability('theme-provider', { getThemes: () => [THEME] });
    await context.registerCapability('font-provider', { getFonts: () => [DM_SANS] });
  },
  deactivate() {},
};

export default AbyssTealThemePlugin;
