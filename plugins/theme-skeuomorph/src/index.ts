/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin, PluginContext } from '@readergo/plugin-sdk';
import {
  BOUND_JOURNAL_THEME,
  BRUSHED_STEEL_THEME,
  LEATHER_DESK_THEME,
  SKEUO_FONTS,
  SKEUO_THEME_IDS,
  SKEUO_THEMES,
  WALNUT_LIBRARY_THEME,
} from './themes';

/**
 * Skeuomorph Suite - physical chrome themes using ThemeMaterials + stylesheet.
 */

export const SkeuomorphThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.skeuomorph',
    name: 'Skeuomorph Suite',
    version: '1.1.1',
    description:
      'Physical chrome themes: Leather Desk, Brushed Steel, Bound Journal, and Walnut Library - materials tokens plus scoped grain stylesheets.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },

  async activate(context: PluginContext) {
    context.log.info('Skeuomorph Suite activating (4 physical atmospheres)...');

    await context.registerCapability('theme-provider', {
      getThemes: () => SKEUO_THEMES,
    });

    await context.registerCapability('font-provider', {
      getFonts: () => SKEUO_FONTS,
    });

    const enable = async (themeId: string) => {
      await context.executeCommand('readergo.theme.setTheme', { themeId });
      return { activeTheme: themeId };
    };

    await context.registerCommand({
      id: 'readergo.theme.skeuomorph.enableLeather',
      title: 'Theme: Leather Desk',
      handler: async () => enable(LEATHER_DESK_THEME.id),
    });

    await context.registerCommand({
      id: 'readergo.theme.skeuomorph.enableSteel',
      title: 'Theme: Brushed Steel',
      handler: async () => enable(BRUSHED_STEEL_THEME.id),
    });

    await context.registerCommand({
      id: 'readergo.theme.skeuomorph.enableJournal',
      title: 'Theme: Bound Journal',
      handler: async () => enable(BOUND_JOURNAL_THEME.id),
    });

    await context.registerCommand({
      id: 'readergo.theme.skeuomorph.enableWalnut',
      title: 'Theme: Walnut Library',
      handler: async () => enable(WALNUT_LIBRARY_THEME.id),
    });

    await context.registerCommand({
      id: 'readergo.theme.skeuomorph.cycle',
      title: 'Theme: Cycle Skeuomorph Atmosphere',
      handler: async () => {
        const active = (await context.executeCommand('readergo.theme.getActiveTheme')) as any;
        const currentId = active?.id || LEATHER_DESK_THEME.id;
        const idx = SKEUO_THEME_IDS.indexOf(currentId);
        const next = SKEUO_THEME_IDS[idx >= 0 ? (idx + 1) % SKEUO_THEME_IDS.length : 0];
        return enable(next);
      },
    });

    await context.registerCommand({
      id: 'readergo.theme.skeuomorph.getModes',
      title: 'Theme: List Skeuomorph Atmospheres',
      handler: async () =>
        SKEUO_THEMES.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          description: t.description,
        })),
    });
  },

  deactivate(context: PluginContext) {
    context.log.info('Skeuomorph Suite deactivated.');
  },
};

export default SkeuomorphThemePlugin;
export * from './themes';
export * from './chrome';
