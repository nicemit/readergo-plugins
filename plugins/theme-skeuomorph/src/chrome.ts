/**
 * Shared physical-chrome CSS fragments.
 * Host wraps each theme stylesheet under [data-theme="<id>"].
 */

/** Narrow tool rail - recessed channel with raised icon wells. */
export const ACTIVITY_BAR_CHROME = `
  /* Outer rail: darker recessed channel with a hard metal/leather edge */
  [data-rg-chrome="activity-bar"] {
    background-color: hsl(var(--background));
    background-image:
      linear-gradient(90deg, rgb(0 0 0 / 0.28), transparent 55%),
      linear-gradient(180deg, rgb(255 255 255 / 0.04), transparent 30%);
    border-right-color: hsl(var(--border));
    border-right-width: 1px;
    box-shadow:
      inset -1px 0 0 rgb(255 255 255 / 0.06),
      inset 2px 0 6px rgb(0 0 0 / 0.35),
      2px 0 10px rgb(0 0 0 / 0.25);
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  [data-rg-chrome="activity-panel"] {
    background-color: hsl(var(--card));
    background-image:
      linear-gradient(180deg, rgb(255 255 255 / 0.05), transparent 28%),
      linear-gradient(90deg, rgb(0 0 0 / 0.12), transparent 40%);
    box-shadow: var(--inset-shadow), 4px 0 18px rgb(0 0 0 / 0.2);
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  [data-rg-chrome="activity-bottom"] {
    border-top-color: hsl(var(--border));
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06);
  }

  /* Brand plate at the top of the rail */
  [data-rg-chrome="activity-brand"] {
    margin: 0.35rem 0.35rem 0.15rem;
    width: calc(3rem - 0.7rem) !important;
    height: 2.75rem !important;
    border-radius: var(--radius-md);
    border: 1px solid hsl(var(--border));
    background-image:
      linear-gradient(180deg, rgb(255 255 255 / 0.1), transparent 55%),
      linear-gradient(0deg, rgb(0 0 0 / 0.2), transparent 40%);
    box-shadow: var(--inset-highlight), var(--shadow-sm);
  }

  [data-rg-chrome="activity-brand"]:hover {
    background-color: hsl(var(--muted));
  }

  /* Icon wells - physical buttons sitting in the channel */
  [data-rg-chrome="activity-item"],
  [data-rg-chrome="activity-collapse"] {
    margin: 0.15rem 0.35rem;
    width: calc(3rem - 0.7rem) !important;
    height: calc(3rem - 0.55rem) !important;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    background-image: linear-gradient(180deg, rgb(255 255 255 / 0.03), transparent 60%);
  }

  [data-rg-chrome="activity-item"]:hover,
  [data-rg-chrome="activity-collapse"]:hover {
    border-color: hsl(var(--border));
    background-color: hsl(var(--muted));
    background-image:
      linear-gradient(180deg, rgb(255 255 255 / 0.1), transparent 50%),
      linear-gradient(0deg, rgb(0 0 0 / 0.15), transparent 40%);
    box-shadow: var(--inset-highlight), var(--shadow-sm);
    color: hsl(var(--foreground));
  }

  /* Active tool - pressed / latched into the rail */
  [data-rg-chrome="activity-item"][data-rg-active="true"] {
    border-color: hsl(var(--primary) / 0.45);
    background-color: hsl(var(--primary) / 0.16);
    background-image:
      linear-gradient(180deg, rgb(255 255 255 / 0.08), transparent 45%),
      linear-gradient(0deg, rgb(0 0 0 / 0.28), transparent 50%);
    box-shadow:
      var(--inset-shadow),
      0 0 0 1px hsl(var(--primary) / 0.2),
      inset 0 0 10px hsl(var(--primary) / 0.12);
    color: hsl(var(--primary));
  }

  [data-rg-chrome="activity-item"][data-rg-active="true"]:hover {
    background-color: hsl(var(--primary) / 0.2);
  }

  /* Inlaid active indicator - brass/LED strip instead of a flat bar */
  [data-rg-chrome="activity-indicator"] {
    left: 0.1rem !important;
    width: 3px !important;
    border-radius: 999px;
    box-shadow:
      0 0 6px hsl(var(--primary) / 0.55),
      inset 0 1px 0 rgb(255 255 255 / 0.35);
  }

  [data-rg-chrome="activity-item"][data-rg-active="true"] [data-rg-chrome="activity-indicator"] {
    opacity: 1 !important;
    background: linear-gradient(
      180deg,
      hsl(var(--primary)),
      hsl(var(--primary) / 0.65)
    ) !important;
  }
`;

/** Embossed panels, recessed fields, raised actuators - works with ThemeMaterials vars. */
export const SHARED_CHROME = `
  ${ACTIVITY_BAR_CHROME}

  /* Recessed trays (inspector / misc side rails) */
  aside,
  [data-sidebar],
  nav[aria-label] {
    box-shadow: var(--inset-shadow);
  }

  /* Embossed cards / popovers */
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
      linear-gradient(180deg, rgb(255 255 255 / 0.08), transparent 42%),
      linear-gradient(0deg, rgb(0 0 0 / 0.14), transparent 38%);
    box-shadow: var(--inset-highlight), var(--shadow-md);
    border-color: hsl(var(--border));
  }

  /* Raised actuators - skip activity-bar items (styled above) */
  button:not([data-rg-chrome^="activity"]),
  [role="button"]:not([data-rg-chrome^="activity"]),
  .bg-primary {
    box-shadow: var(--inset-highlight), var(--shadow-sm);
  }

  button:not([data-rg-chrome^="activity"]):active,
  [role="button"]:not([data-rg-chrome^="activity"]):active {
    box-shadow: var(--inset-shadow);
    transform: translateY(1px);
  }

  /* Recessed fields */
  input,
  textarea,
  select,
  [data-slot="input"] {
    box-shadow: var(--inset-shadow);
    background-image: linear-gradient(180deg, rgb(0 0 0 / 0.1), transparent 55%);
  }

  /* Hairline metal/leather edge on focus */
  button:focus-visible,
  [role="button"]:focus-visible,
  a:focus-visible,
  input:focus-visible,
  textarea:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  /* Kill glass - materials already zero blur; keep surfaces opaque */
  .backdrop-blur-sm,
  .backdrop-blur,
  .backdrop-blur-md,
  .backdrop-blur-lg,
  .backdrop-blur-xl,
  .backdrop-blur-2xl,
  .backdrop-blur-3xl {
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }
`;

/** Grain strength reads --rg-leather-grain (Style Settings toggle: 1 on, 0 off). */
export const LEATHER_GRAIN = `
  --rg-leather-grain: 1;
  background-image:
    radial-gradient(ellipse at 18% 8%, rgb(140 80 45 / calc(0.22 * var(--rg-leather-grain, 1))), transparent 42%),
    radial-gradient(ellipse at 82% 92%, rgb(30 14 8 / calc(0.35 * var(--rg-leather-grain, 1))), transparent 48%),
    repeating-linear-gradient(
      118deg,
      rgb(255 230 180 / calc(0.025 * var(--rg-leather-grain, 1))) 0 1px,
      transparent 1px 4px
    ),
    repeating-linear-gradient(
      28deg,
      rgb(0 0 0 / calc(0.04 * var(--rg-leather-grain, 1))) 0 2px,
      transparent 2px 5px
    );
`;

export const STEEL_BRUSH = `
  background-image:
    linear-gradient(180deg, rgb(255 255 255 / 0.06), transparent 35%),
    repeating-linear-gradient(
      90deg,
      rgb(255 255 255 / 0.035) 0 1px,
      transparent 1px 3px
    ),
    repeating-linear-gradient(
      0deg,
      rgb(0 0 0 / 0.04) 0 1px,
      transparent 1px 2px
    );
`;

export const JOURNAL_FIBER = `
  background-image:
    radial-gradient(ellipse at 50% 0%, rgb(255 255 255 / 0.55), transparent 55%),
    repeating-linear-gradient(
      0deg,
      rgb(40 30 20 / 0.03) 0 1px,
      transparent 1px 3px
    ),
    repeating-linear-gradient(
      90deg,
      rgb(40 30 20 / 0.02) 0 1px,
      transparent 1px 4px
    );
`;

export const WALNUT_GRAIN = `
  background-image:
    radial-gradient(ellipse at 30% 20%, rgb(160 100 50 / 0.15), transparent 50%),
    repeating-linear-gradient(
      95deg,
      rgb(255 210 150 / 0.03) 0 2px,
      transparent 2px 7px
    ),
    repeating-linear-gradient(
      5deg,
      rgb(0 0 0 / 0.06) 0 1px,
      transparent 1px 6px
    );
`;

export const PORCELAIN_GLOSS = `
  background-image:
    radial-gradient(ellipse at 20% 0%, rgb(255 255 255 / 0.9), transparent 45%),
    radial-gradient(ellipse at 80% 100%, rgb(180 200 220 / 0.18), transparent 50%),
    linear-gradient(180deg, rgb(255 255 255 / 0.35), transparent 40%);
`;

export const LACQUER_SHEEN = `
  background-image:
    radial-gradient(ellipse at 15% 10%, rgb(180 40 40 / 0.22), transparent 40%),
    radial-gradient(ellipse at 85% 90%, rgb(0 0 0 / 0.45), transparent 45%),
    linear-gradient(135deg, rgb(255 200 160 / 0.05), transparent 40%),
    repeating-linear-gradient(
      120deg,
      rgb(255 255 255 / 0.02) 0 1px,
      transparent 1px 5px
    );
`;

export const DENIM_TWILL = `
  background-image:
    repeating-linear-gradient(
      45deg,
      rgb(255 255 255 / 0.03) 0 1px,
      transparent 1px 4px
    ),
    repeating-linear-gradient(
      -45deg,
      rgb(0 0 0 / 0.05) 0 1px,
      transparent 1px 4px
    ),
    radial-gradient(ellipse at 50% 0%, rgb(100 140 200 / 0.12), transparent 55%);
`;

export const BRASS_PATINA = `
  background-image:
    radial-gradient(ellipse at 25% 15%, rgb(220 170 80 / 0.14), transparent 45%),
    radial-gradient(ellipse at 75% 85%, rgb(40 25 10 / 0.35), transparent 50%),
    repeating-linear-gradient(
      92deg,
      rgb(255 210 120 / 0.04) 0 1px,
      transparent 1px 3px
    );
`;
