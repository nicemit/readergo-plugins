#!/usr/bin/env node
/**
 * Catalog gate: a center-pane overlay must say whether it is document-bound
 * or workspace chrome before it can be published.
 *
 * The host still refuses to paint a document overlay on any other note.
 * This check fails the catalog build when a plugin forgets the contract.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginsDir = path.join(root, 'plugins');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const failures = [];

for (const pluginName of fs.readdirSync(pluginsDir)) {
  const src = path.join(pluginsDir, pluginName, 'src');
  if (!fs.existsSync(src)) continue;
  for (const file of walk(src)) {
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('center-pane-overlay') || !text.includes('registerCapability')) continue;
    const scope = text.match(/scope:\s*['"](active-document|workspace)['"]/);
    const rel = path.relative(root, file);
    if (!scope) {
      failures.push(
        `${rel}: center-pane-overlay must set scope to 'active-document' or 'workspace'`,
      );
      continue;
    }
    if (scope[1] === 'active-document' && !text.includes('boundNoteId')) {
      failures.push(`${rel}: active-document overlays must set boundNoteId`);
    }
    if (scope[1] === 'workspace' && /absolute\s+inset-0/.test(text)) {
      failures.push(
        `${rel}: workspace overlays cannot cover the pane (absolute inset-0). Use scope 'active-document'.`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error('Overlay scope check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Overlay scope check passed');
