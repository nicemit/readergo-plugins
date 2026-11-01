import { Plugin, PluginContext } from '@readergo/plugin-sdk'

const IBM_PLEX = {
  id: 'ibm-plex-sans',
  name: 'IBM Plex Sans',
  family: "'IBM Plex Sans', system-ui, sans-serif",
  category: 'sans' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
  targets: ['all'] as const,
}

const THEME = {
  id: 'gruvbox-dark',
  name: 'Gruvbox Dark',
  type: 'dark' as const,
  author: 'Pavel Pertsev',
  description: 'Earthy warm dark palette designed for long reading sessions without glare.',
  colors: {
    background: '0 0% 16%',
    foreground: '43 59% 81%',
    card: '20 5% 22%',
    cardForeground: '43 59% 81%',
    border: '20 6% 28%',
    primary: '27 99% 55%',
    primaryForeground: '0 0% 16%',
    secondary: '20 5% 22%',
    secondaryForeground: '43 59% 81%',
    muted: '20 5% 22%',
    mutedForeground: '34 24% 62%',
    accent: '61 66% 44%',
    accentForeground: '0 0% 16%',
    destructive: '6 74% 51%',
    destructiveForeground: '43 59% 81%',
    success: '80 61% 44%',
    successForeground: '0 0% 16%',
    warning: '42 87% 55%',
    warningForeground: '0 0% 16%',
    info: '157 16% 58%',
    infoForeground: '0 0% 16%',
    input: '20 5% 22%',
    ring: '27 99% 55%',
    heading1: '43 59% 81%',
    heading2: '27 99% 55%',
    heading3: '61 66% 50%',
  },
  fonts: {
    display: IBM_PLEX,
    body: IBM_PLEX,
  },
}

export const GruvboxThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.gruvbox',
    name: 'Gruvbox Dark',
    version: '1.0.0',
    description: 'Warm retro-groove dark theme with orange accents and IBM Plex Sans.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },
  async activate(context: PluginContext) {
    await context.registerCapability('theme-provider', {
      getThemes: () => [THEME],
    })
    await context.registerCapability('font-provider', {
      getFonts: () => [IBM_PLEX],
    })
    context.log.info('Gruvbox Dark theme activated')
  },
  deactivate(context: PluginContext) {
    context.log.info('Gruvbox Dark theme deactivated')
  },
}

export default GruvboxThemePlugin
