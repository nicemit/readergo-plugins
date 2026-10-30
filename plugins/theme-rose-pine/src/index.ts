import { Plugin, PluginContext } from '@readergo/plugin-sdk'

const INSTRUMENT = {
  id: 'instrument-serif',
  name: 'Instrument Serif',
  family: "'Instrument Serif', 'Georgia', serif",
  category: 'serif' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap',
  targets: ['display', 'editor'] as const,
}

const INTER = {
  id: 'inter-ui',
  name: 'Inter',
  family: "'Inter', system-ui, sans-serif",
  category: 'sans' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  targets: ['body'] as const,
}

const THEME = {
  id: 'rose-pine',
  name: 'Rose Pine',
  type: 'dark' as const,
  author: 'Rosé Pine',
  description: 'Muted pine and rose palette for a calm, classy reading room.',
  colors: {
    background: '249 22% 12%',
    foreground: '245 50% 91%',
    card: '247 23% 15%',
    cardForeground: '245 50% 91%',
    border: '248 15% 22%',
    primary: '2 55% 83%',
    primaryForeground: '249 22% 12%',
    secondary: '247 23% 15%',
    secondaryForeground: '245 50% 91%',
    muted: '247 23% 15%',
    mutedForeground: '249 12% 47%',
    accent: '189 43% 73%',
    accentForeground: '249 22% 12%',
    destructive: '343 76% 68%',
    destructiveForeground: '245 50% 91%',
    success: '197 49% 38%',
    successForeground: '245 50% 91%',
    warning: '35 88% 80%',
    warningForeground: '249 22% 12%',
    info: '267 57% 78%',
    infoForeground: '249 22% 12%',
    input: '247 23% 15%',
    ring: '2 55% 83%',
    heading1: '2 55% 83%',
    heading2: '189 43% 73%',
    heading3: '267 57% 78%',
  },
  fonts: {
    display: INSTRUMENT,
    body: INTER,
    editor: INSTRUMENT,
  },
}

export const RosePineThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.rose-pine',
    name: 'Rose Pine',
    version: '1.0.0',
    description: 'All natural pine, faux fur and a bit of soho vibes for the classy minimalist. Instrument Serif headings.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },
  async activate(context: PluginContext) {
    await context.registerCapability('theme-provider', {
      getThemes: () => [THEME],
    })
    await context.registerCapability('font-provider', {
      getFonts: () => [INSTRUMENT, INTER],
    })
    context.log.info('Rose Pine theme activated')
  },
  deactivate(context: PluginContext) {
    context.log.info('Rose Pine theme deactivated')
  },
}

export default RosePineThemePlugin
