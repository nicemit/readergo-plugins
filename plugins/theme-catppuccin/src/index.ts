import { Plugin, PluginContext } from '@readergo/plugin-sdk'

const NUNITO = {
  id: 'nunito',
  name: 'Nunito',
  family: "'Nunito', system-ui, sans-serif",
  category: 'sans' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,600;0,700;1,400&display=swap',
  targets: ['all'] as const,
}

const THEME = {
  id: 'catppuccin-mocha',
  name: 'Catppuccin Mocha',
  type: 'dark' as const,
  author: 'Catppuccin',
  description: 'Soothing pastel mocha palette with mauve highlights for late-night reading.',
  colors: {
    background: '240 21% 15%',
    foreground: '226 64% 88%',
    card: '240 21% 12%',
    cardForeground: '226 64% 88%',
    border: '237 16% 23%',
    primary: '267 84% 81%',
    primaryForeground: '240 21% 15%',
    secondary: '237 16% 23%',
    secondaryForeground: '226 64% 88%',
    muted: '237 16% 23%',
    mutedForeground: '228 17% 64%',
    accent: '199 76% 69%',
    accentForeground: '240 21% 15%',
    destructive: '343 81% 75%',
    destructiveForeground: '240 21% 15%',
    success: '115 54% 76%',
    successForeground: '240 21% 15%',
    warning: '41 86% 83%',
    warningForeground: '240 21% 15%',
    info: '217 92% 76%',
    infoForeground: '240 21% 15%',
    input: '240 21% 12%',
    ring: '267 84% 81%',
    heading1: '267 84% 81%',
    heading2: '199 76% 69%',
    heading3: '217 92% 76%',
  },
  fonts: {
    display: NUNITO,
    body: NUNITO,
  },
}

export const CatppuccinThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.catppuccin',
    name: 'Catppuccin Mocha',
    version: '1.0.0',
    description: 'Soothing pastel dark theme (Mocha) with mauve accents and Nunito typography.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },
  async activate(context: PluginContext) {
    await context.registerCapability('theme-provider', {
      getThemes: () => [THEME],
    })
    await context.registerCapability('font-provider', {
      getFonts: () => [NUNITO],
    })
    context.log.info('Catppuccin Mocha theme activated')
  },
  deactivate(context: PluginContext) {
    context.log.info('Catppuccin Mocha theme deactivated')
  },
}

export default CatppuccinThemePlugin
