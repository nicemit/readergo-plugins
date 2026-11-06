/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin, PluginContext } from '@readergo/plugin-sdk';

const ORBITRON = {
  id: 'orbitron-arcade',
  name: 'Orbitron',
  family: "'Orbitron', system-ui, sans-serif",
  category: 'display' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700&display=swap',
  targets: ['display'] as const,
};

const EXO = {
  id: 'exo-2-arcade',
  name: 'Exo 2',
  family: "'Exo 2', system-ui, sans-serif",
  category: 'sans' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400;0,600;0,700;1,400&display=swap',
  targets: ['body', 'editor', 'all'] as const,
};

const THEME = {
  id: 'arcade-neon',
  name: 'Arcade Neon',
  type: 'dark' as const,
  author: 'ReaderGo Studio',
  description: 'Cabinet-black night with magenta / cyan neon actuators and hard geometric chrome.',
  colors: {
    background: '260 30% 6%',
    foreground: '300 20% 94%',
    card: '260 28% 10%',
    cardForeground: '300 20% 94%',
    border: '280 25% 22%',
    primary: '320 85% 58%',
    primaryForeground: '260 40% 6%',
    secondary: '260 22% 14%',
    secondaryForeground: '180 40% 80%',
    muted: '260 20% 12%',
    mutedForeground: '270 12% 55%',
    accent: '180 90% 48%',
    accentForeground: '260 40% 6%',
    destructive: '0 85% 55%',
    destructiveForeground: '0 0% 100%',
    success: '150 80% 45%',
    successForeground: '260 40% 6%',
    warning: '45 95% 55%',
    warningForeground: '260 40% 6%',
    info: '180 90% 48%',
    infoForeground: '260 40% 6%',
    input: '260 26% 9%',
    ring: '320 85% 58%',
    heading1: '320 90% 72%',
    heading2: '180 85% 65%',
    heading3: '280 50% 70%',
  },
  fonts: { display: ORBITRON, body: EXO, editor: EXO, mono: EXO },
  materials: {
    radius: '0.25rem',
    radiusSm: '0.15rem',
    radiusMd: '0.2rem',
    radiusLg: '0.25rem',
    radiusXl: '0.35rem',
    radius2xl: '0.45rem',
    surfaceBlur: '0px',
    shadowMd: '0 0 0 1px rgb(255 0 180 / 0.15), 0 8px 24px rgb(0 0 0 / 0.55)',
    insetHighlight: 'inset 0 1px 0 rgb(255 100 220 / 0.15)',
  },
  stylesheet: `
    background-image:
      radial-gradient(ellipse at 10% 0%, rgb(255 0 160 / 0.12), transparent 40%),
      radial-gradient(ellipse at 90% 100%, rgb(0 255 220 / 0.1), transparent 45%),
      linear-gradient(180deg, transparent 60%, rgb(0 0 0 / 0.35));
  `,
  stylesheetScoped: true,
};

export const ArcadeNeonThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.arcade-neon',
    name: 'Arcade Neon',
    version: '1.0.0',
    description: 'Night-arcade dark with magenta and cyan neon signals plus Orbitron display type.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },
  async activate(context: PluginContext) {
    await context.registerCapability('theme-provider', { getThemes: () => [THEME] });
    await context.registerCapability('font-provider', { getFonts: () => [ORBITRON, EXO] });
  },
  deactivate() {},
};

export default ArcadeNeonThemePlugin;
