/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin, PluginContext } from '@readergo/plugin-sdk';

const VT323_FONT = {
  id: 'vt323',
  name: 'VT323 Retro CRT',
  family: "'VT323', monospace",
  category: 'mono' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=VT323&display=swap',
  targets: ['all'] as const,
};

const AMBER_THEME = {
  id: 'amber-terminal',
  name: 'Amber CRT Terminal',
  type: 'dark' as const,
  author: 'Sovereign Telemetry',
  description: '1980s monochrome phosphor amber on matte obsidian carbon with authentic CRT monospace typography.',
  colors: {
    background: '0 0% 8%',           // Pure matte obsidian
    foreground: '38 95% 62%',        // Radiant Phosphor Amber #fbb034
    card: '0 0% 12%',                // Dark instrument tray
    cardForeground: '38 95% 62%',
    border: '38 45% 24%',            // Hairline amber rule
    primary: '38 95% 54%',           // Saturated amber key
    primaryForeground: '0 0% 8%',
    secondary: '0 0% 16%',
    secondaryForeground: '38 90% 58%',
    muted: '0 0% 13%',
    mutedForeground: '38 40% 45%',   // Dim amber glow
    accent: '38 95% 54%',            // Phosphor amber LED
    accentForeground: '0 0% 8%',
    destructive: '0 75% 55%',
    destructiveForeground: '0 0% 100%',
    success: '38 95% 58%',           // Amber phosphor sync beacon
    successForeground: '0 0% 8%',
    warning: '25 95% 52%',           // Warm amber dirty warning
    warningForeground: '0 0% 8%',
    info: '45 90% 52%',              // Soft amber saving pulse
    infoForeground: '0 0% 8%',
    input: '0 0% 12%',
    ring: '38 95% 54%',
    heading1: '38 95% 72%',
    heading2: '38 85% 65%',
    heading3: '38 75% 58%',
  },
  fonts: {
    display: VT323_FONT,
    body: VT323_FONT,
    mono: VT323_FONT,
    editor: VT323_FONT,
  },
};

export const AmberThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.amber',
    name: 'Amber CRT Terminal',
    version: '1.1.0',
    description: 'Vintage 1980s monochrome phosphor amber theme on matte obsidian with authentic VT323 CRT typography.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },
  async activate(context: PluginContext) {
    context.log.info('📟 Amber CRT Terminal theme plugin activating with VT323 typography...');
    await context.registerCapability('theme-provider', {
      getThemes: () => [AMBER_THEME],
    });
    await context.registerCapability('font-provider', {
      getFonts: () => [VT323_FONT],
    });
  },
  deactivate(context: PluginContext) {
    context.log.info('📟 Amber CRT Terminal theme plugin deactivated.');
  },
};


export default AmberThemePlugin;
