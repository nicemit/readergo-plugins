/**
 * Anti-ghosting and high-contrast CSS engine for E-Ink displays.
 * Disables hardware-throttled transitions and animations, removes blurred shadows,
 * and forces crisp solid borders for e-paper refresh controllers.
 */

const STYLE_ELEMENT_ID = 'readergo-eink-runtime-styles';

const EINK_GLOBAL_CSS = `
/* -------------------------------------------------------------
 * ReaderGo E-Ink Performance & Anti-Ghosting Styles
 * Active whenever an e-ink theme is selected (data-theme="eink-*")
 * ------------------------------------------------------------- */

[data-theme^="eink-"] *,
[data-theme^="eink-"] *::before,
[data-theme^="eink-"] *::after {
  /* Eliminate animated frame renders that cause visual ghosting on e-paper */
  transition-duration: 0.0001ms !important;
  transition-delay: 0s !important;
  animation-duration: 0.0001ms !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  scroll-behavior: auto !important;

  /* Remove subtle blurs, glowing rings, and drop shadows that cause dithering smudges */
  box-shadow: none !important;
  text-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* Crisp, high-contrast borders on interactive controls */
[data-theme^="eink-"] button,
[data-theme^="eink-"] input,
[data-theme^="eink-"] select,
[data-theme^="eink-"] textarea {
  border-width: 1.5px !important;
}

/* Sharp focus outlines instead of soft colored glow rings */
[data-theme^="eink-"] button:focus-visible,
[data-theme^="eink-"] input:focus-visible,
[data-theme^="eink-"] select:focus-visible,
[data-theme^="eink-"] textarea:focus-visible,
[data-theme^="eink-"] [tabindex]:focus-visible {
  outline: 2px solid currentColor !important;
  outline-offset: 2px !important;
}

/* Strict 1-bit solid black outlines for extreme sunlight contrast */
[data-theme="eink-high-contrast"] button,
[data-theme="eink-high-contrast"] input,
[data-theme="eink-high-contrast"] select,
[data-theme="eink-high-contrast"] textarea,
[data-theme="eink-high-contrast"] [role="button"],
[data-theme="eink-high-contrast"] .border {
  border-width: 2px !important;
  border-color: #000000 !important;
}

/* Ensure code blocks and blockquotes are clearly boxed */
[data-theme^="eink-"] pre,
[data-theme^="eink-"] code {
  border-width: 1px !important;
  border-style: solid !important;
}

/* High-contrast active selection */
[data-theme^="eink-"] ::selection {
  background-color: #000000 !important;
  color: #FFFFFF !important;
}

[data-theme="eink-night"] ::selection {
  background-color: #FFFFFF !important;
  color: #000000 !important;
}
`;

export function injectEinkStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ELEMENT_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = EINK_GLOBAL_CSS;
  document.head.appendChild(style);
}

export function removeEinkStyles(): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(STYLE_ELEMENT_ID);
  if (existing) {
    existing.remove();
  }
}

/**
 * Triggers a hardware-style page inversion flash (120ms total)
 * to force E-Ink display controllers (Carta Regal waveform) to clear ghosted ink.
 */
export function triggerEinkScreenRefresh(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();

  return new Promise((resolve) => {
    const existing = document.getElementById('readergo-eink-flash-overlay');
    if (existing) existing.remove();

    const flash = document.createElement('div');
    flash.id = 'readergo-eink-flash-overlay';
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.zIndex = '999999';
    flash.style.pointerEvents = 'none';
    flash.style.backgroundColor = '#000000';
    flash.style.opacity = '1';
    flash.style.transition = 'none';

    document.body.appendChild(flash);

    // Invert black -> white -> clear
    setTimeout(() => {
      flash.style.backgroundColor = '#FFFFFF';
      setTimeout(() => {
        flash.remove();
        resolve();
      }, 70);
    }, 70);
  });
}
