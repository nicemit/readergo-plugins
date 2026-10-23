#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = path.join(root, "plugins");
const catalogDir = path.join(root, "public");

await fs.mkdir(catalogDir, { recursive: true });

const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
const catalog = [];

function runtimeBundleName(runtimeRel) {
  if (typeof runtimeRel !== "string" || !/\.(mjs|js)$/i.test(runtimeRel)) {
    return null;
  }
  return path.basename(runtimeRel);
}

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const pluginDir = path.join(pluginsDir, entry.name);
  const manifestPath = path.join(pluginDir, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch {
    continue;
  }

  const row = {
    id: manifest.id,
    name: manifest.name,
    description: manifest.description || "",
    category: manifest.category,
    version: manifest.version || "1.0.0",
  };
  let wrote = false;

  if (manifest.main && String(manifest.main).endsWith(".js")) {
    const entryPath = path.join(pluginDir, manifest.main);
    try {
      const entryCode = await fs.readFile(entryPath, "utf8");
      const bundleName = `${entry.name}.bundle.json`;
      await fs.writeFile(
        path.join(catalogDir, bundleName),
        JSON.stringify({ manifest, entryCode }, null, 2),
      );
      row.bundleUrl = bundleName;
      wrote = true;
    } catch (err) {
      console.warn(`Could not read UI entry for ${entry.name}: ${err.message}`);
    }
  }

  const runtimeName = runtimeBundleName(manifest.components?.runtime);
  if (runtimeName && manifest.components?.runtime) {
    const runtimePath = path.join(pluginDir, manifest.components.runtime);
    try {
      const runtimeSource = await fs.readFile(runtimePath, "utf8");
      const runtimeManifest = {
        ...manifest,
        components: {
          ...(manifest.components || {}),
          runtime: `./${runtimeName}`,
        },
      };
      const runtimeBundle = `${entry.name}.runtime.json`;
      await fs.writeFile(
        path.join(catalogDir, runtimeBundle),
        JSON.stringify(
          {
            manifest: runtimeManifest,
            files: { [runtimeName]: runtimeSource },
          },
          null,
          2,
        ),
      );
      row.runtimeBundleUrl = runtimeBundle;
      wrote = true;
    } catch (err) {
      console.warn(`Could not read runtime entry for ${entry.name}: ${err.message}`);
    }
  }

  if (wrote && row.id) {
    catalog.push(row);
  }
}

catalog.sort((a, b) => a.name.localeCompare(b.name));
await fs.writeFile(
  path.join(catalogDir, "catalog.json"),
  JSON.stringify({ plugins: catalog }, null, 2) + "\n",
);

console.log(`Successfully generated marketplace catalog (${catalog.length} plugins in public/catalog.json)`);
