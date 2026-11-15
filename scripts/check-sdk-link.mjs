#!/usr/bin/env node
/**
 * Local-dev gate: plugin typecheck paths must point at the sibling readergo repo.
 *
 * Catalog compile does not bundle @readergo/plugin-sdk (host-external), so CI on
 * this public repo can build without checking out the private host. Local
 * authoring still needs ../readergo next to this repo for types.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hostRoot = path.resolve(root, '../readergo');
const inCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

const expected = {
  '@readergo/plugin-sdk': path.join(hostRoot, 'packages/plugin-sdk'),
  '@readergo/plugin-contracts': path.join(hostRoot, 'packages/plugin-contracts'),
};

if (!fs.existsSync(hostRoot)) {
  if (inCi) {
    console.warn(
      'CI: sibling host repo not present - skipping SDK link check (SDK is host-external at compile).',
    );
    process.exit(0);
  }
  console.error('SDK link check failed:');
  console.error(
    `- Sibling host repo missing at ${hostRoot}. Clone readergo next to readergo-plugins.`,
  );
  process.exit(1);
}

const failures = [];

for (const [name, hostPkg] of Object.entries(expected)) {
  if (!fs.existsSync(path.join(hostPkg, 'package.json'))) {
    failures.push(`${name}: host package missing at ${hostPkg}`);
  }
}

const vendored = path.join(root, 'packages/plugin-sdk');
if (fs.existsSync(vendored) && !fs.lstatSync(vendored).isSymbolicLink()) {
  const pkgJson = path.join(vendored, 'package.json');
  if (fs.existsSync(pkgJson)) {
    failures.push(
      `Vendored ${vendored} still present. Remove it; types come from ../readergo via tsconfig paths.`,
    );
  }
}

if (failures.length > 0) {
  console.error('SDK link check failed:');
  for (const line of failures) console.error(`- ${line}`);
  process.exit(1);
}

console.log('SDK link check passed (tsconfig paths -> sibling readergo)');
