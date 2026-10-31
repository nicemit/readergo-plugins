/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Plugin, PluginContext } from '@readergo/plugin-sdk';
import {
  EINK_THEMES,
  EINK_FONTS,
  EINK_THEME_IDS,
  EINK_PAPER_THEME,
  EINK_WARM_THEME,
  EINK_NIGHT_THEME,
  EINK_HIGH_CONTRAST_THEME,
} from './einkThemes';
import {
  injectEinkStyles,
  removeEinkStyles,
  triggerEinkScreenRefresh,
} from './einkStyles';

export const EinkThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.eink',
    name: 'E-Ink Reading Suite',
    version: '1.0.0',
    description:
      'Comprehensive high-contrast monochromatic e-paper themes, print typography, and anti-ghosting performance optimizations for E-Ink tablets and distraction-free reading.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },

  async activate(context: PluginContext) {
    context.log.info('📖 E-Ink Reading Suite activating with 4 e-paper atmospheres & typography...');

    // 1. Register Theme Provider Capability
    await context.registerCapability('theme-provider', {
      getThemes: () => EINK_THEMES,
    });

    // 2. Register Font Provider Capability
    await context.registerCapability('font-provider', {
      getFonts: () => EINK_FONTS,
    });

    // 3. Register Convenient Workspace Commands
    await context.registerCommand({
      id: 'readergo.eink.enablePaper',
      title: 'E-Ink: Carta Paper Mode',
      handler: async () => {
        await context.executeCommand('readergo.theme.setTheme', { themeId: EINK_PAPER_THEME.id });
        return { activeTheme: EINK_PAPER_THEME.id };
      },
    });

    await context.registerCommand({
      id: 'readergo.eink.enableWarm',
      title: 'E-Ink: Warm Amber Newsprint Mode',
      handler: async () => {
        await context.executeCommand('readergo.theme.setTheme', { themeId: EINK_WARM_THEME.id });
        return { activeTheme: EINK_WARM_THEME.id };
      },
    });

    await context.registerCommand({
      id: 'readergo.eink.enableNight',
      title: 'E-Ink: Onyx Night Inverted Mode',
      handler: async () => {
        await context.executeCommand('readergo.theme.setTheme', { themeId: EINK_NIGHT_THEME.id });
        return { activeTheme: EINK_NIGHT_THEME.id };
      },
    });

    await context.registerCommand({
      id: 'readergo.eink.enableHighContrast',
      title: 'E-Ink: 1-Bit High Contrast Mode',
      handler: async () => {
        await context.executeCommand('readergo.theme.setTheme', { themeId: EINK_HIGH_CONTRAST_THEME.id });
        return { activeTheme: EINK_HIGH_CONTRAST_THEME.id };
      },
    });

    await context.registerCommand({
      id: 'readergo.eink.cycleMode',
      title: 'E-Ink: Cycle Reading Atmosphere',
      handler: async () => {
        const activeTheme = (await context.executeCommand('readergo.theme.getActiveTheme')) as any;
        const currentId = activeTheme?.id || EINK_PAPER_THEME.id;
        const currentIndex = EINK_THEME_IDS.indexOf(currentId);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % EINK_THEME_IDS.length : 0;
        const nextThemeId = EINK_THEME_IDS[nextIndex];

        await context.executeCommand('readergo.theme.setTheme', { themeId: nextThemeId });
        return { activeTheme: nextThemeId };
      },
    });

    await context.registerCommand({
      id: 'readergo.eink.triggerFullRefresh',
      title: 'E-Ink: Trigger Hardware Screen Refresh (Clear Ghosting)',
      handler: async () => {
        await triggerEinkScreenRefresh();
        return { refreshed: true };
      },
    });

    await context.registerCommand({
      id: 'readergo.eink.getModes',
      title: 'E-Ink: Get Available Reading Modes',
      handler: async () =>
        EINK_THEMES.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          description: t.description,
        })),
    });

    // 4. Inject Anti-Ghosting Styles into DOM
    injectEinkStyles();

    context.log.info('📖 E-Ink Reading Suite ready.');
  },

  deactivate(context: PluginContext) {
    removeEinkStyles();
    context.log.info('📖 E-Ink Reading Suite deactivated.');
  },
};

export default EinkThemePlugin;
export * from './einkThemes';
export * from './einkStyles';
