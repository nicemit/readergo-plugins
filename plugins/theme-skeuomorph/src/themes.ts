import {
  JOURNAL_FIBER,
  LEATHER_GRAIN,
  SHARED_CHROME,
  STEEL_BRUSH,
  WALNUT_GRAIN,
} from './chrome';

export const FRAUNCES = {
  id: 'fraunces-display',
  name: 'Fraunces',
  family: "'Fraunces', 'Georgia', serif",
  category: 'display' as const,
  cssUrl:
    'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap',
  targets: ['display', 'editor'] as const,
};

export const SOURCE_SANS = {
  id: 'source-sans-3',
  name: 'Source Sans 3',
  family: "'Source Sans 3', system-ui, sans-serif",
  category: 'sans' as const,
  cssUrl:
    'https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap',
  targets: ['body', 'all'] as const,
};

export const IBM_PLEX_MONO = {
  id: 'ibm-plex-mono-steel',
  name: 'IBM Plex Mono',
  family: "'IBM Plex Mono', ui-monospace, monospace",
  category: 'mono' as const,
  cssUrl:
    'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap',
  targets: ['mono'] as const,
};

export const LITERATA = {
  id: 'literata-journal',
  name: 'Literata',
  family: "'Literata', 'Georgia', serif",
  category: 'serif' as const,
  cssUrl:
    'https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;0,7..72,700;1,7..72,400&display=swap',
  targets: ['display', 'editor'] as const,
};

export const SKEUO_FONTS = [FRAUNCES, SOURCE_SANS, IBM_PLEX_MONO, LITERATA];

const PHYSICAL_MATERIALS_BASE = {
  surfaceBlur: '0px',
  borderWidth: '1px',
};

export const LEATHER_DESK_THEME = {
  id: 'leather-desk',
  name: 'Leather Desk',
  type: 'dark' as const,
  author: 'ReaderGo Materials',
  description:
    'Walnut blotter and brass actuators - embossed cards, recessed trays, leather grain.',
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
    ...PHYSICAL_MATERIALS_BASE,
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
    insetHighlight: 'inset 0 1px 0 rgb(255 230 180 / 0.22)',
    insetShadow: 'inset 0 2px 4px rgb(0 0 0 / 0.45), inset 0 1px 0 rgb(0 0 0 / 0.25)',
  },
  stylesheet: `${LEATHER_GRAIN}\n${SHARED_CHROME}`,
  stylesheetScoped: true,
};

export const BRUSHED_STEEL_THEME = {
  id: 'brushed-steel',
  name: 'Brushed Steel',
  type: 'dark' as const,
  author: 'ReaderGo Materials',
  description:
    'Cold instrument panel - machined aluminum grain, tight radii, cyan status LEDs.',
  colors: {
    background: '210 12% 14%',
    foreground: '210 20% 92%',
    card: '210 10% 18%',
    cardForeground: '210 20% 92%',
    border: '210 8% 32%',
    primary: '198 72% 48%',
    primaryForeground: '210 30% 8%',
    secondary: '210 10% 22%',
    secondaryForeground: '210 15% 85%',
    muted: '210 8% 20%',
    mutedForeground: '210 8% 58%',
    accent: '198 72% 48%',
    accentForeground: '210 30% 8%',
    destructive: '0 65% 50%',
    destructiveForeground: '0 0% 100%',
    success: '152 45% 42%',
    successForeground: '0 0% 100%',
    warning: '38 85% 50%',
    warningForeground: '210 30% 8%',
    info: '198 72% 52%',
    infoForeground: '210 30% 8%',
    input: '210 12% 16%',
    ring: '198 72% 52%',
    heading1: '198 70% 72%',
    heading2: '200 45% 68%',
    heading3: '205 30% 64%',
  },
  fonts: {
    display: SOURCE_SANS,
    body: SOURCE_SANS,
    editor: SOURCE_SANS,
    mono: IBM_PLEX_MONO,
  },
  materials: {
    ...PHYSICAL_MATERIALS_BASE,
    radius: '0.35rem',
    radiusSm: '0.2rem',
    radiusMd: '0.28rem',
    radiusLg: '0.35rem',
    radiusXl: '0.45rem',
    radius2xl: '0.55rem',
    shadowSm: '0 1px 0 rgb(255 255 255 / 0.14), 0 1px 2px rgb(0 0 0 / 0.5)',
    shadowMd:
      '0 1px 0 rgb(255 255 255 / 0.1), 0 3px 8px rgb(0 0 0 / 0.45), inset 0 -1px 0 rgb(0 0 0 / 0.25)',
    shadowLg: '0 10px 24px rgb(0 0 0 / 0.5), 0 1px 0 rgb(255 255 255 / 0.08)',
    shadowXl: '0 18px 36px rgb(0 0 0 / 0.55)',
    insetHighlight: 'inset 0 1px 0 rgb(255 255 255 / 0.28)',
    insetShadow: 'inset 0 2px 5px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(0 0 0 / 0.3)',
  },
  stylesheet: `${STEEL_BRUSH}\n${SHARED_CHROME}`,
  stylesheetScoped: true,
};

export const BOUND_JOURNAL_THEME = {
  id: 'bound-journal',
  name: 'Bound Journal',
  type: 'light' as const,
  author: 'ReaderGo Materials',
  description:
    'Cloth-bound notebook - inked linen fiber, soft pressed pages, midnight ink accents.',
  colors: {
    background: '40 18% 93%',
    foreground: '220 25% 16%',
    card: '40 22% 97%',
    cardForeground: '220 25% 16%',
    border: '35 12% 78%',
    primary: '222 35% 28%',
    primaryForeground: '40 30% 96%',
    secondary: '38 14% 88%',
    secondaryForeground: '220 20% 22%',
    muted: '38 12% 90%',
    mutedForeground: '220 10% 42%',
    accent: '160 28% 32%',
    accentForeground: '40 30% 96%',
    destructive: '4 65% 42%',
    destructiveForeground: '0 0% 100%',
    success: '152 35% 32%',
    successForeground: '0 0% 100%',
    warning: '32 70% 38%',
    warningForeground: '0 0% 100%',
    info: '210 40% 38%',
    infoForeground: '0 0% 100%',
    input: '40 20% 95%',
    ring: '222 35% 32%',
    heading1: '222 40% 22%',
    heading2: '220 28% 28%',
    heading3: '218 20% 34%',
  },
  fonts: {
    display: LITERATA,
    body: SOURCE_SANS,
    editor: LITERATA,
    mono: IBM_PLEX_MONO,
  },
  materials: {
    ...PHYSICAL_MATERIALS_BASE,
    radius: '0.55rem',
    radiusSm: '0.35rem',
    radiusMd: '0.45rem',
    radiusLg: '0.55rem',
    radiusXl: '0.7rem',
    radius2xl: '0.85rem',
    shadowSm: '0 1px 0 rgb(255 255 255 / 0.85), 0 1px 2px rgb(40 30 20 / 0.12)',
    shadowMd:
      '0 1px 0 rgb(255 255 255 / 0.9), 0 4px 12px rgb(40 30 20 / 0.12), 0 1px 3px rgb(40 30 20 / 0.08)',
    shadowLg: '0 12px 28px rgb(40 30 20 / 0.14), 0 2px 6px rgb(40 30 20 / 0.08)',
    shadowXl: '0 20px 40px rgb(40 30 20 / 0.16)',
    insetHighlight: 'inset 0 1px 0 rgb(255 255 255 / 0.95)',
    insetShadow: 'inset 0 2px 4px rgb(40 30 20 / 0.12), inset 0 1px 0 rgb(40 30 20 / 0.06)',
  },
  stylesheet: `${JOURNAL_FIBER}\n${SHARED_CHROME}`,
  stylesheetScoped: true,
};

export const WALNUT_LIBRARY_THEME = {
  id: 'walnut-library',
  name: 'Walnut Library',
  type: 'dark' as const,
  author: 'ReaderGo Materials',
  description:
    'Deep library shelves - warm wood grain, amber lamps, wide embossed panels.',
  colors: {
    background: '28 32% 10%',
    foreground: '38 35% 86%',
    card: '28 28% 14%',
    cardForeground: '38 35% 86%',
    border: '32 24% 24%',
    primary: '32 70% 46%',
    primaryForeground: '28 40% 8%',
    secondary: '28 22% 18%',
    secondaryForeground: '38 28% 80%',
    muted: '28 20% 15%',
    mutedForeground: '32 16% 52%',
    accent: '150 35% 40%',
    accentForeground: '28 40% 8%',
    destructive: '8 68% 46%',
    destructiveForeground: '0 0% 100%',
    success: '150 35% 40%',
    successForeground: '0 0% 100%',
    warning: '36 78% 48%',
    warningForeground: '28 40% 8%',
    info: '200 35% 48%',
    infoForeground: '0 0% 100%',
    input: '28 26% 12%',
    ring: '32 70% 50%',
    heading1: '38 55% 70%',
    heading2: '34 42% 64%',
    heading3: '30 32% 58%',
  },
  fonts: {
    display: FRAUNCES,
    body: SOURCE_SANS,
    editor: FRAUNCES,
    mono: IBM_PLEX_MONO,
  },
  materials: {
    ...PHYSICAL_MATERIALS_BASE,
    radius: '0.75rem',
    radiusSm: '0.45rem',
    radiusMd: '0.55rem',
    radiusLg: '0.75rem',
    radiusXl: '1rem',
    radius2xl: '1.15rem',
    shadowSm: '0 1px 0 rgb(255 200 120 / 0.1), 0 1px 3px rgb(0 0 0 / 0.5)',
    shadowMd:
      '0 1px 0 rgb(255 200 120 / 0.08), 0 6px 14px rgb(0 0 0 / 0.45), 0 2px 4px rgb(0 0 0 / 0.35)',
    shadowLg: '0 14px 32px rgb(0 0 0 / 0.55), 0 4px 10px rgb(0 0 0 / 0.4)',
    shadowXl: '0 24px 48px rgb(0 0 0 / 0.6)',
    insetHighlight: 'inset 0 1px 0 rgb(255 210 140 / 0.18)',
    insetShadow: 'inset 0 3px 6px rgb(0 0 0 / 0.5), inset 0 1px 0 rgb(0 0 0 / 0.3)',
  },
  stylesheet: `${WALNUT_GRAIN}\n${SHARED_CHROME}`,
  stylesheetScoped: true,
};

export const SKEUO_THEMES = [
  LEATHER_DESK_THEME,
  BRUSHED_STEEL_THEME,
  BOUND_JOURNAL_THEME,
  WALNUT_LIBRARY_THEME,
];

export const SKEUO_THEME_IDS = SKEUO_THEMES.map((t) => t.id);
