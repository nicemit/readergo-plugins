#!/usr/bin/env node
/**
 * Local-dev gate: @readergo/plugin-sdk and plugin-contracts must resolve
 * to the sibling readergo repo (file: deps), not a vendored drift copy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hostRoot = path.resolve(root, '../readergo');
const require = createRequire(path.join(root, 'package.json'));

const expected = {
  '@readergo/plugin-sdk': path.join(hostRoot, 'packages/plugin-sdk'),
  '@readergo/plugin-contracts': path.join(hostRoot, 'packages/plugin-contracts'),
};

const failures = [];

if (!fs.existsSync(hostRoot)) {
  failures.push(
    `Sibling host repo missing at ${hostRoot}. Clone readergo next to readergo-plugins.`,
  );
}

for (const [name, hostPkg] of Object.entries(expected)) {
  if (!fs.existsSync(path.join(hostPkg, 'package.json'))) {
    failures.push(`${name}: host package missing at ${hostPkg}`);
    continue;
  }
  const linked = path.join(root, 'node_modules', ...name.split('/'));
  if (!fs.existsSync(linked)) {
    failures.push(`${name}: not installed at ${linked}. Run npm install.`);
    continue;
  }
  const realResolved = fs.realpathSync(linked);
  const realHost = fs.realpathSync(hostPkg);
  if (realResolved !== realHost) {
    failures.push(
      `${name}: resolves to ${realResolved}, expected host package ${realHost}`,
    );
  }
  // Smoke that Node can load the package entry (exports-aware).
  try {
    require.resolve(name);
  } catch (err) {
    failures.push(
      `${name}: entry unresolved (${err instanceof Error ? err.message : err})`,
    );
  }
}

const vendored = path.join(root, 'packages/plugin-sdk');
if (fs.existsSync(vendored) && !fs.lstatSync(vendored).isSymbolicLink()) {
  const pkgJson = path.join(vendored, 'package.json');
  if (fs.existsSync(pkgJson)) {
    failures.push(
      `Vendored ${vendored} still present. Remove it; use file:../readergo/packages/plugin-sdk.`,
    );
  }
}

if (failures.length > 0) {
  console.error('SDK link check failed:');
  for (const line of failures) console.error(`- ${line}`);
  process.exit(1);
}

console.log('SDK link check passed (plugin-sdk + plugin-contracts -> sibling readergo)');
