/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin, PluginContext } from '@readergo/plugin-sdk';
import {
  BOUND_JOURNAL_THEME,
  BRASS_CONSOLE_THEME,
  BRUSHED_STEEL_THEME,
  CINNABAR_LACQUER_THEME,
  DENIM_BENCH_THEME,
  LEATHER_DESK_THEME,
  SKEUO_FONTS,
  SKEUO_THEME_IDS,
  SKEUO_THEMES,
  SOFT_PORCELAIN_THEME,
  WALNUT_LIBRARY_THEME,
} from './themes';

/**
 * Skeuomorph Suite - physical chrome themes using ThemeMaterials + stylesheet.
 */

export const SkeuomorphThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.skeuomorph',
    name: 'Skeuomorph Suite',
    version: '1.3.1',
    description:
      'Eight physical chrome themes: Leather Desk (editor tokens + Style Settings), Brushed Steel, Bound Journal, Walnut Library, Soft Porcelain, Cinnabar Lacquer, Denim Bench, and Brass Console.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },

  async activate(context: PluginContext) {
    context.log.info(`Skeuomorph Suite activating (${SKEUO_THEMES.length} physical atmospheres)...`);

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

    const commands: Array<{ id: string; title: string; themeId: string }> = [
      { id: 'readergo.theme.skeuomorph.enableLeather', title: 'Theme: Leather Desk', themeId: LEATHER_DESK_THEME.id },
      { id: 'readergo.theme.skeuomorph.enableSteel', title: 'Theme: Brushed Steel', themeId: BRUSHED_STEEL_THEME.id },
      { id: 'readergo.theme.skeuomorph.enableJournal', title: 'Theme: Bound Journal', themeId: BOUND_JOURNAL_THEME.id },
      { id: 'readergo.theme.skeuomorph.enableWalnut', title: 'Theme: Walnut Library', themeId: WALNUT_LIBRARY_THEME.id },
      { id: 'readergo.theme.skeuomorph.enablePorcelain', title: 'Theme: Soft Porcelain', themeId: SOFT_PORCELAIN_THEME.id },
      { id: 'readergo.theme.skeuomorph.enableLacquer', title: 'Theme: Cinnabar Lacquer', themeId: CINNABAR_LACQUER_THEME.id },
      { id: 'readergo.theme.skeuomorph.enableDenim', title: 'Theme: Denim Bench', themeId: DENIM_BENCH_THEME.id },
      { id: 'readergo.theme.skeuomorph.enableBrass', title: 'Theme: Brass Console', themeId: BRASS_CONSOLE_THEME.id },
    ];

    for (const cmd of commands) {
      await context.registerCommand({
        id: cmd.id,
        title: cmd.title,
        handler: async () => enable(cmd.themeId),
      });
    }

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
