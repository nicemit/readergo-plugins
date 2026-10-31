/**
 * High-legibility print & e-book fonts designed for E-Ink screens
 */
export const EINK_FONT_LITERATA = {
  id: 'eink-literata',
  name: 'Literata (Digital Book Serif)',
  family: "'Literata', 'Charter', 'Merriweather', 'Georgia', serif",
  category: 'serif' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;0,7..72,700;1,7..72,400&display=swap',
  targets: ['all'] as const,
};

export const EINK_FONT_COURIER_PRIME = {
  id: 'eink-courier-prime',
  name: 'Courier Prime (Typewriter Print)',
  family: "'Courier Prime', 'Courier New', monospace",
  category: 'mono' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap',
  targets: ['all'] as const,
};

export const EINK_FONT_ATKINSON = {
  id: 'eink-atkinson',
  name: 'Atkinson Hyperlegible (Low Glare Sans)',
  family: "'Atkinson Hyperlegible', system-ui, -apple-system, sans-serif",
  category: 'sans' as const,
  cssUrl: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap',
  targets: ['all'] as const,
};

export const EINK_FONTS = [
  EINK_FONT_LITERATA,
  EINK_FONT_COURIER_PRIME,
  EINK_FONT_ATKINSON,
];

/**
 * 1. E-Ink Carta Paper (Pure Light)
 * Crisp reflective paper with pitch black typography and hairline black borders.
 */
export const EINK_PAPER_THEME = {
  id: 'eink-paper',
  name: 'E-Ink Carta Paper',
  type: 'light' as const,
  author: 'E-Ink Reading Suite',
  description: 'Reflective digital paper with India ink typography and zero ghosting for daytime e-paper reading.',
  colors: {
    background: '0 0% 100%',
    foreground: '0 0% 0%',
    card: '0 0% 100%',
    cardForeground: '0 0% 0%',
    border: '0 0% 0%',
    primary: '0 0% 0%',
    primaryForeground: '0 0% 100%',
    secondary: '0 0% 95%',
    secondaryForeground: '0 0% 0%',
    muted: '0 0% 93%',
    mutedForeground: '0 0% 28%',
    accent: '0 0% 35%',
    accentForeground: '0 0% 100%',
    destructive: '0 0% 20%',
    destructiveForeground: '0 0% 100%',
    input: '0 0% 100%',
    ring: '0 0% 0%',
    heading1: '0 0% 0%',
    heading2: '0 0% 0%',
    heading3: '0 0% 15%',
    success: '0 0% 20%',
    warning: '0 0% 30%',
    info: '0 0% 25%',
  },
  fonts: {
    display: EINK_FONT_LITERATA,
    body: EINK_FONT_ATKINSON,
    editor: EINK_FONT_LITERATA,
    mono: EINK_FONT_COURIER_PRIME,
  },
  customVars: {
    'eink-mode': 'paper',
    'eink-border-width': '1.5px',
  },
};

/**
 * 2. E-Ink Warm Amber (Newsprint & Natural Paperback)
 * Soothing cream ivory with bistre ink typography, perfect for warm frontlights.
 */
export const EINK_WARM_THEME = {
  id: 'eink-warm',
  name: 'E-Ink Warm Amber',
  type: 'light' as const,
  author: 'E-Ink Reading Suite',
  description: 'Natural warm paperback newsprint tone designed for long-form reading with warm backlights.',
  colors: {
    background: '40 28% 96%',
    foreground: '30 15% 10%',
    card: '40 25% 98%',
    cardForeground: '30 15% 10%',
    border: '30 12% 25%',
    primary: '30 18% 12%',
    primaryForeground: '40 28% 96%',
    secondary: '38 20% 91%',
    secondaryForeground: '30 15% 10%',
    muted: '38 18% 90%',
    mutedForeground: '30 10% 38%',
    accent: '35 25% 32%',
    accentForeground: '40 28% 96%',
    destructive: '15 35% 25%',
    destructiveForeground: '40 28% 96%',
    input: '40 25% 98%',
    ring: '30 18% 12%',
    heading1: '30 18% 8%',
    heading2: '30 18% 12%',
    heading3: '30 14% 20%',
    success: '35 25% 25%',
    warning: '35 30% 35%',
    info: '30 20% 30%',
  },
  fonts: {
    display: EINK_FONT_LITERATA,
    body: EINK_FONT_ATKINSON,
    editor: EINK_FONT_LITERATA,
    mono: EINK_FONT_COURIER_PRIME,
  },
  customVars: {
    'eink-mode': 'warm',
    'eink-border-width': '1.5px',
  },
};

/**
 * 3. E-Ink Onyx Night (Inverted Dark)
 * Pitch black background with crisp white typography for low-light e-reader usage.
 */
export const EINK_NIGHT_THEME = {
  id: 'eink-night',
  name: 'E-Ink Onyx Night',
  type: 'dark' as const,
  author: 'E-Ink Reading Suite',
  description: 'Inverted pitch black e-paper mode with stark white ink and zero glare for night reading on frontlit tablets.',
  colors: {
    background: '0 0% 0%',
    foreground: '0 0% 100%',
    card: '0 0% 0%',
    cardForeground: '0 0% 100%',
    border: '0 0% 85%',
    primary: '0 0% 100%',
    primaryForeground: '0 0% 0%',
    secondary: '0 0% 12%',
    secondaryForeground: '0 0% 100%',
    muted: '0 0% 15%',
    mutedForeground: '0 0% 75%',
    accent: '0 0% 70%',
    accentForeground: '0 0% 0%',
    destructive: '0 0% 80%',
    destructiveForeground: '0 0% 0%',
    input: '0 0% 0%',
    ring: '0 0% 100%',
    heading1: '0 0% 100%',
    heading2: '0 0% 100%',
    heading3: '0 0% 88%',
    success: '0 0% 85%',
    warning: '0 0% 75%',
    info: '0 0% 80%',
  },
  fonts: {
    display: EINK_FONT_LITERATA,
    body: EINK_FONT_ATKINSON,
    editor: EINK_FONT_LITERATA,
    mono: EINK_FONT_COURIER_PRIME,
  },
  customVars: {
    'eink-mode': 'night',
    'eink-border-width': '1.5px',
  },
};

/**
 * 4. E-Ink 1-Bit Crisp (Direct Sunlight & Speed / A2 Refresh Modes)
 * Strict 1-bit black & white only. Zero grays, zero dither blur. Maximum contrast.
 */
export const EINK_HIGH_CONTRAST_THEME = {
  id: 'eink-high-contrast',
  name: 'E-Ink 1-Bit High Contrast',
  type: 'light' as const,
  author: 'E-Ink Reading Suite',
  description: 'Strict 1-bit black & white palette. No midtone gray dithering. Ideal for direct sunlight and fast A2 refresh modes.',
  colors: {
    background: '0 0% 100%',
    foreground: '0 0% 0%',
    card: '0 0% 100%',
    cardForeground: '0 0% 0%',
    border: '0 0% 0%',
    primary: '0 0% 0%',
    primaryForeground: '0 0% 100%',
    secondary: '0 0% 100%',
    secondaryForeground: '0 0% 0%',
    muted: '0 0% 100%',
    mutedForeground: '0 0% 0%',
    accent: '0 0% 0%',
    accentForeground: '0 0% 100%',
    destructive: '0 0% 0%',
    destructiveForeground: '0 0% 100%',
    input: '0 0% 100%',
    ring: '0 0% 0%',
    heading1: '0 0% 0%',
    heading2: '0 0% 0%',
    heading3: '0 0% 0%',
    success: '0 0% 0%',
    warning: '0 0% 0%',
    info: '0 0% 0%',
  },
  fonts: {
    display: EINK_FONT_ATKINSON,
    body: EINK_FONT_ATKINSON,
    editor: EINK_FONT_ATKINSON,
    mono: EINK_FONT_COURIER_PRIME,
  },
  customVars: {
    'eink-mode': 'high-contrast',
    'eink-border-width': '2px',
  },
};

export const EINK_THEMES = [
  EINK_PAPER_THEME,
  EINK_WARM_THEME,
  EINK_NIGHT_THEME,
  EINK_HIGH_CONTRAST_THEME,
];

export const EINK_THEME_IDS = EINK_THEMES.map((t) => t.id);
