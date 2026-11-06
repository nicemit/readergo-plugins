/**
 * Build a compact SVG mock of a ReaderGo workspace painted with theme preview colors.
 * Used by build-catalog.mjs so theme plugins ship a screenshot without hand-drawn assets.
 */

function hsl(triplet, fallback = '0 0% 50%') {
  const value = typeof triplet === 'string' && triplet.trim() ? triplet.trim() : fallback;
  return `hsl(${value})`;
}

export function buildThemePreviewSvg(preview = {}) {
  const bg = hsl(preview.background, '231 29% 8%');
  const fg = hsl(preview.foreground, '210 40% 98%');
  const card = hsl(preview.card, preview.background || '223 48% 16%');
  const primary = hsl(preview.primary, '273 66% 62%');
  const accent = hsl(preview.accent, preview.primary || '109 100% 54%');
  const border = hsl(preview.border, '258 22% 26%');
  const muted = hsl(preview.muted, preview.card || '223 48% 16%');
  const label = String(preview.label || preview.name || 'Theme').slice(0, 28);
  const style = String(preview.style || '').slice(0, 42);
  const scheme = preview.type === 'light' ? 'light' : 'dark';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="${escapeXml(label)} theme preview">
  <defs>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.12"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="${bg}"/>
  <rect width="960" height="540" fill="url(#sheen)"/>

  <!-- Activity rail -->
  <rect x="0" y="0" width="64" height="540" fill="${card}" stroke="${border}" stroke-width="1"/>
  <rect x="14" y="22" width="36" height="36" rx="8" fill="${primary}"/>
  <rect x="18" y="78" width="28" height="28" rx="7" fill="${muted}" stroke="${border}"/>
  <rect x="18" y="118" width="28" height="28" rx="7" fill="${primary}" opacity="0.85"/>
  <rect x="18" y="158" width="28" height="28" rx="7" fill="${muted}" stroke="${border}"/>
  <rect x="18" y="480" width="28" height="28" rx="7" fill="${accent}" opacity="0.9"/>

  <!-- Side panel -->
  <rect x="64" y="0" width="240" height="540" fill="${card}" stroke="${border}" stroke-width="1"/>
  <rect x="84" y="28" width="200" height="34" rx="8" fill="${muted}" stroke="${border}"/>
  <rect x="96" y="40" width="90" height="10" rx="4" fill="${fg}" opacity="0.25"/>
  <rect x="84" y="86" width="120" height="10" rx="4" fill="${fg}" opacity="0.45"/>
  <rect x="84" y="118" width="180" height="52" rx="10" fill="${bg}" stroke="${border}"/>
  <rect x="98" y="134" width="110" height="9" rx="4" fill="${fg}" opacity="0.35"/>
  <rect x="98" y="150" width="70" height="8" rx="4" fill="${fg}" opacity="0.2"/>
  <rect x="84" y="188" width="180" height="52" rx="10" fill="${bg}" stroke="${border}"/>
  <rect x="98" y="204" width="130" height="9" rx="4" fill="${fg}" opacity="0.35"/>
  <rect x="98" y="220" width="80" height="8" rx="4" fill="${fg}" opacity="0.2"/>

  <!-- Main -->
  <rect x="320" y="28" width="300" height="18" rx="6" fill="${fg}" opacity="0.55"/>
  <rect x="320" y="56" width="160" height="10" rx="4" fill="${fg}" opacity="0.25"/>

  <rect x="320" y="90" width="392" height="120" rx="16" fill="${card}" stroke="${border}"/>
  <rect x="344" y="114" width="180" height="12" rx="5" fill="${fg}" opacity="0.4"/>
  <rect x="344" y="138" width="300" height="9" rx="4" fill="${fg}" opacity="0.2"/>
  <rect x="344" y="156" width="260" height="9" rx="4" fill="${fg}" opacity="0.16"/>
  <rect x="344" y="178" width="88" height="18" rx="6" fill="${primary}"/>

  <rect x="320" y="232" width="186" height="110" rx="14" fill="${card}" stroke="${border}"/>
  <circle cx="344" cy="258" r="6" fill="${accent}"/>
  <rect x="360" y="252" width="100" height="10" rx="4" fill="${fg}" opacity="0.35"/>
  <rect x="344" y="280" width="140" height="8" rx="4" fill="${fg}" opacity="0.18"/>
  <rect x="344" y="298" width="110" height="8" rx="4" fill="${fg}" opacity="0.14"/>

  <rect x="526" y="232" width="186" height="110" rx="14" fill="${card}" stroke="${border}"/>
  <circle cx="550" cy="258" r="6" fill="${primary}"/>
  <rect x="566" y="252" width="100" height="10" rx="4" fill="${fg}" opacity="0.35"/>
  <rect x="550" y="280" width="140" height="8" rx="4" fill="${fg}" opacity="0.18"/>
  <rect x="550" y="298" width="110" height="8" rx="4" fill="${fg}" opacity="0.14"/>

  <!-- New tiles -->
  <rect x="320" y="364" width="120" height="72" rx="12" fill="${card}" stroke="${border}"/>
  <rect x="456" y="364" width="120" height="72" rx="12" fill="${card}" stroke="${border}"/>
  <rect x="592" y="364" width="120" height="72" rx="12" fill="${card}" stroke="${border}"/>
  <rect x="344" y="392" width="72" height="10" rx="4" fill="${fg}" opacity="0.3"/>
  <rect x="480" y="392" width="72" height="10" rx="4" fill="${fg}" opacity="0.3"/>
  <rect x="616" y="392" width="72" height="10" rx="4" fill="${fg}" opacity="0.3"/>

  <!-- Caption plate -->
  <rect x="320" y="468" width="392" height="48" rx="12" fill="${muted}" stroke="${border}"/>
  <text x="340" y="490" fill="${fg}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="700">${escapeXml(label)}</text>
  <text x="340" y="508" fill="${fg}" opacity="0.55" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">${escapeXml(style || scheme)}</text>
  <circle cx="680" cy="492" r="7" fill="${primary}"/>
  <circle cx="700" cy="492" r="7" fill="${accent}"/>
  <circle cx="720" cy="492" r="7" fill="${border}"/>
</svg>`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
