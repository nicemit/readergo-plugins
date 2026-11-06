/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin, PluginContext } from '@readergo/plugin-sdk';

/**
 * Leather Desk - demonstrates ThemeMaterials + first-class stylesheet.
 * Host applies radius/shadow/blur tokens and injects scoped CSS under [data-theme].
 */

const FRAUNCES = {
  id: 'fraunces-display',
  name: 'Fraunces',
  family: "'Fraunces', 'Georgia', serif",
  category: 'display' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap',
  targets: ['display', 'editor'] as const,
};

const SOURCE_SANS = {
  id: 'source-sans-3',
  name: 'Source Sans 3',
  family: "'Source Sans 3', system-ui, sans-serif",
  category: 'sans' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap',
  targets: ['body', 'all'] as const,
};

const LEATHER_STYLESHEET = `
  /* Desk blotter grain on the workspace root */
  background-image:
    radial-gradient(ellipse at 20% 10%, rgb(120 70 40 / 0.18), transparent 45%),
    radial-gradient(ellipse at 80% 90%, rgb(40 20 10 / 0.25), transparent 50%),
    repeating-linear-gradient(
      115deg,
      rgb(255 255 255 / 0.015) 0 1px,
      transparent 1px 3px
    );

  .bg-card,
  .bg-card\\/40,
  .bg-card\\/50,
  .bg-card\\/60,
  .bg-card\\/70,
  .bg-card\\/75,
  .bg-card\\/80,
  .bg-card\\/85,
  .bg-popover,
  .bg-popover\\/95 {
    background-image:
      linear-gradient(180deg, rgb(255 255 255 / 0.07), transparent 40%),
      linear-gradient(0deg, rgb(0 0 0 / 0.12), transparent 35%);
    box-shadow: var(--inset-highlight), var(--shadow-md);
    border-color: hsl(var(--border));
  }

  button,
  [role="button"],
  .bg-primary {
    box-shadow:
      var(--inset-highlight),
      0 1px 0 rgb(255 220 160 / 0.25),
      var(--shadow-sm);
  }

  button:active,
  [role="button"]:active {
    box-shadow: var(--inset-shadow);
    transform: translateY(1px);
  }

  input,
  textarea,
  select,
  [data-slot="input"] {
    box-shadow: var(--inset-shadow);
    background-image: linear-gradient(180deg, rgb(0 0 0 / 0.08), transparent 50%);
  }

  /* Soft brass edge on focused actuators */
  button:focus-visible,
  [role="button"]:focus-visible,
  a:focus-visible,
  input:focus-visible,
  textarea:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }
`;

const LEATHER_DESK_THEME = {
  id: 'leather-desk',
  name: 'Leather Desk',
  type: 'dark' as const,
  author: 'ReaderGo Materials',
  description:
    'Skeuomorphic walnut-and-brass desk: physical radius, embossed elevation, zero frosted blur, and a scoped leather grain stylesheet.',
  colors: {
    background: '25 28% 12%',
    foreground: '36 40% 88%',
    card: '25 24% 16%',
    cardForeground: '36 40% 88%',
    border: '30 22% 28%',
    primary: '36 55% 48%',
    primaryForeground: '25 40% 10%',
    secondary: '25 18% 20%',
    secondaryForeground: '36 30% 82%',
    muted: '25 16% 18%',
    mutedForeground: '30 14% 58%',
    accent: '36 55% 48%',
    accentForeground: '25 40% 10%',
    destructive: '6 70% 48%',
    destructiveForeground: '0 0% 100%',
    success: '142 40% 42%',
    successForeground: '0 0% 100%',
    warning: '38 80% 48%',
    warningForeground: '25 40% 10%',
    info: '200 40% 48%',
    infoForeground: '0 0% 100%',
    input: '25 22% 14%',
    ring: '36 55% 52%',
    heading1: '36 60% 72%',
    heading2: '34 45% 66%',
    heading3: '32 35% 60%',
  },
  fonts: {
    display: FRAUNCES,
    body: SOURCE_SANS,
    editor: FRAUNCES,
    mono: SOURCE_SANS,
  },
  materials: {
    radius: '0.65rem',
    radiusSm: '0.4rem',
    radiusMd: '0.5rem',
    radiusLg: '0.65rem',
    radiusXl: '0.85rem',
    radius2xl: '1rem',
    shadowSm: '0 1px 0 rgb(255 220 160 / 0.12), 0 1px 2px rgb(0 0 0 / 0.45)',
    shadowMd:
      '0 1px 0 rgb(255 220 160 / 0.1), 0 4px 10px rgb(0 0 0 / 0.4), 0 2px 4px rgb(0 0 0 / 0.35)',
    shadowLg:
      '0 1px 0 rgb(255 220 160 / 0.08), 0 12px 28px rgb(0 0 0 / 0.5), 0 4px 10px rgb(0 0 0 / 0.35)',
    shadowXl: '0 22px 40px rgb(0 0 0 / 0.55), 0 8px 16px rgb(0 0 0 / 0.4)',
    surfaceBlur: '0px',
    borderWidth: '1px',
    insetHighlight: 'inset 0 1px 0 rgb(255 230 180 / 0.22)',
    insetShadow: 'inset 0 2px 4px rgb(0 0 0 / 0.45), inset 0 1px 0 rgb(0 0 0 / 0.25)',
  },
  stylesheet: LEATHER_STYLESHEET,
  stylesheetScoped: true,
};

export const SkeuomorphThemePlugin: Plugin = {
  manifest: {
    id: 'readergo.theme.skeuomorph',
    name: 'Leather Desk',
    version: '1.0.0',
    description:
      'Skeuomorphic leather-and-brass workspace chrome with physical materials and a scoped theme stylesheet.',
    category: 'feature',
    provides: ['theme-provider', 'font-provider'],
    permissions: [],
  },

  async activate(context: PluginContext) {
    context.log.info('Leather Desk skeuomorph theme activating (materials + stylesheet)...');

    await context.registerCapability('theme-provider', {
      getThemes: () => [LEATHER_DESK_THEME],
    });

    await context.registerCapability('font-provider', {
      getFonts: () => [FRAUNCES, SOURCE_SANS],
    });

    await context.registerCommand({
      id: 'readergo.theme.skeuomorph.enable',
      title: 'Theme: Enable Leather Desk',
      handler: async () => {
        await context.executeCommand('readergo.theme.setTheme', {
          themeId: LEATHER_DESK_THEME.id,
        });
        return { activeTheme: LEATHER_DESK_THEME.id };
      },
    });
  },

  deactivate(context: PluginContext) {
    context.log.info('Leather Desk skeuomorph theme deactivated.');
  },
};

export default SkeuomorphThemePlugin;
