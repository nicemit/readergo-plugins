/**
 * Shared physical-chrome CSS fragments.
 * Host wraps each theme stylesheet under [data-theme="<id>"].
 */

/** Embossed panels, recessed fields, raised actuators - works with ThemeMaterials vars. */
export const SHARED_CHROME = `
  /* Recessed trays (side rails, inspector, activity bar) */
  aside,
  [data-sidebar],
  nav[aria-label],
  .border-r.bg-background\\/95,
  .border-r.bg-background\\/70,
  .border-r.bg-background\\/85,
  .border-l {
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

  /* Raised actuators */
  button,
  [role="button"],
  .bg-primary {
    box-shadow: var(--inset-highlight), var(--shadow-sm);
  }

  button:active,
  [role="button"]:active {
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

export const LEATHER_GRAIN = `
  background-image:
    radial-gradient(ellipse at 18% 8%, rgb(140 80 45 / 0.22), transparent 42%),
    radial-gradient(ellipse at 82% 92%, rgb(30 14 8 / 0.35), transparent 48%),
    repeating-linear-gradient(
      118deg,
      rgb(255 230 180 / 0.025) 0 1px,
      transparent 1px 4px
    ),
    repeating-linear-gradient(
      28deg,
      rgb(0 0 0 / 0.04) 0 2px,
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
