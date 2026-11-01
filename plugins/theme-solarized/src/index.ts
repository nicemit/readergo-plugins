import { Plugin, PluginContext } from '@readergo/plugin-sdk'

const SOURCE_SERIF = {
  id: 'source-serif-4',
  name: 'Source Serif 4',
  family: "'Source Serif 4', 'Georgia', serif",
  category: 'serif' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap',
  targets: ['display', 'editor'] as const,
}

const SOURCE_SANS = {
  id: 'source-sans-3',
  name: 'Source Sans 3',
  family: "'Source Sans 3', system-ui, sans-serif",
  category: 'sans' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap',
  targets: ['body'] as const,
}

const THEME = {
  id: 'solarized-light',
  name: 'Solarized Light',
  type: 'light' as const,
  author: 'Ethan Schoonover',
  description: 'Precision-tuned cream reading palette with cyan accents and serif prose.',
  colors: {
    background: '44 87% 94%',
    foreground: '192 81% 14%',
    card: '46 42% 88%',
    cardForeground: '192 81% 14%',
    border: '45 23% 77%',
    primary: '175 59% 40%',
    primaryForeground: '44 87% 94%',
    secondary: '46 42% 88%',
    secondaryForeground: '192 81% 14%',
    muted: '45 23% 77%',
    mutedForeground: '186 8% 45%',
    accent: '205 69% 49%',
    accentForeground: '44 87% 94%',
    destructive: '1 71% 52%',
    destructiveForeground: '44 87% 94%',
    success: '68 100% 30%',
    successForeground: '44 87% 94%',
    warning: '45 100% 35%',
    warningForeground: '44 87% 94%',
    info: '205 69% 49%',
    infoForeground: '44 87% 94%',
    input: '46 42% 88%',
    ring: '175 59% 40%',
    heading1: '192 81% 14%',
    heading2: '175 59% 33%',
    heading3: '205 69% 40%',
  },
  fonts: {
    display: SOURCE_SERIF,
    body: SOURCE_SANS,
    editor: SOURCE_SERIF,
  },
}

export const SolarizedThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.solarized',
    name: 'Solarized Light',
    version: '1.0.0',
    description: "Ethan Schoonover's Solarized Light palette with Source Serif reading type.",
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },
  async activate(context: PluginContext) {
    await context.registerCapability('theme-provider', {
      getThemes: () => [THEME],
    })
    await context.registerCapability('font-provider', {
      getFonts: () => [SOURCE_SERIF, SOURCE_SANS],
    })
    context.log.info('Solarized Light theme activated')
  },
  deactivate(context: PluginContext) {
    context.log.info('Solarized Light theme deactivated')
  },
}

export default SolarizedThemePlugin
