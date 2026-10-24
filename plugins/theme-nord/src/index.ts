/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin, PluginContext } from '@readergo/plugin-sdk';

const JAKARTA_FONT = {
  id: 'plus-jakarta-sans',
  name: 'Plus Jakarta Sans',
  family: "'Plus Jakarta Sans', sans-serif",
  category: 'sans' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  targets: ['all'] as const,
};

const NORD_THEME = {
  id: 'nord-frost',
  name: 'Nord Frost',
  type: 'dark' as const,
  author: 'Arctic Ice Studio',
  description: 'An arctic, north-bluish palette engineered for calm focus with clean Plus Jakarta Sans typography.',
  colors: {
    background: '220 16% 14%',       // Nord 0 #2e3440
    foreground: '218 27% 92%',       // Nord 6 #eceff4
    card: '222 16% 19%',             // Nord 1 #3b4252
    cardForeground: '218 27% 92%',
    border: '220 17% 28%',           // Nord 2 #434c5e
    primary: '193 43% 67%',          // Nord 8 #88c0d0 Frost Cyan
    primaryForeground: '220 16% 14%',
    secondary: '220 16% 22%',        // Nord 2
    secondaryForeground: '218 27% 92%',
    muted: '222 16% 19%',
    mutedForeground: '219 14% 65%',  // Nord 4 #d8dee9
    accent: '179 25% 65%',           // Nord 7 #8fbcbb Phosphor Mint
    accentForeground: '220 16% 14%',
    destructive: '354 42% 56%',      // Nord 11 #bf616a Aurora Red
    destructiveForeground: '218 27% 92%',
    success: '92 28% 65%',           // Nord 14 #a3be8c Aurora Green
    successForeground: '220 16% 14%',
    warning: '40 71% 73%',           // Nord 13 #ebcb8b Aurora Yellow
    warningForeground: '220 16% 14%',
    info: '193 43% 67%',             // Nord 8 #88c0d0 Frost Cyan
    infoForeground: '220 16% 14%',
    input: '222 16% 19%',
    ring: '193 43% 67%',
    heading1: '193 43% 75%',
    heading2: '213 32% 72%',
    heading3: '179 25% 72%',
  },
  fonts: {
    display: JAKARTA_FONT,
    body: JAKARTA_FONT,
  },
};

export const NordThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.nord',
    name: 'Nord Frost Theme',
    version: '1.1.0',
    description: 'Arctic, north-bluish clean palette engineered for calm focus with Plus Jakarta Sans typography.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },
  async activate(context: PluginContext) {
    context.log.info('❄️ Nord Frost theme plugin activating with typography...');
    await context.registerCapability('theme-provider', {
      getThemes: () => [NORD_THEME],
    });
    await context.registerCapability('font-provider', {
      getFonts: () => [JAKARTA_FONT],
    });
  },
  deactivate(context: PluginContext) {
    context.log.info('❄️ Nord Frost theme plugin deactivated.');
  },
};


export default NordThemePlugin;
