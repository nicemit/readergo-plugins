#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import crypto from "node:crypto";
import { buildThemePreviewSvg } from "./theme-preview-svg.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = path.join(root, "plugins");
const catalogDir = path.join(root, "public");
const screenshotsDir = path.join(catalogDir, "screenshots");

await fs.mkdir(catalogDir, { recursive: true });
await fs.mkdir(screenshotsDir, { recursive: true });

const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
const catalog = [];

function runtimeBundleName(runtimeRel) {
  if (typeof runtimeRel !== "string" || !/\.(mjs|js)$/i.test(runtimeRel)) {
    return null;
  }
  return path.basename(runtimeRel);
}

function isThemeManifest(manifest) {
  const category = String(manifest.category || "").toLowerCase();
  const provides = Array.isArray(manifest.provides) ? manifest.provides : [];
  return category === "theme" || provides.includes("theme-provider");
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

  const provides = Array.isArray(manifest.provides) ? manifest.provides : [];
  const category =
    manifest.category ||
    (provides.includes("theme-provider") ? "theme" : "feature");

  const row = {
    id: manifest.id,
    name: manifest.name,
    description: manifest.description || "",
    category,
    version: manifest.version || "1.0.0",
    provides,
  };

  if (manifest.longDescription) row.longDescription = manifest.longDescription;
  if (manifest.style) row.style = manifest.style;
  if (Array.isArray(manifest.tags) && manifest.tags.length > 0) {
    row.tags = manifest.tags;
  }
  if (manifest.preview && typeof manifest.preview === "object") {
    row.preview = manifest.preview;
  }
  if (typeof manifest.screenshot === "string" && manifest.screenshot.trim()) {
    row.screenshot = manifest.screenshot.trim();
  }

  let wrote = false;

  if (manifest.main && String(manifest.main).endsWith(".js")) {
    const entryPath = path.join(pluginDir, manifest.main);
    try {
      const entryCode = await fs.readFile(entryPath, "utf8");
      const bundleName = `${entry.name}.bundle.json`;
      const bundleData = JSON.stringify({ manifest, entryCode }, null, 2);
      await fs.writeFile(
        path.join(catalogDir, bundleName),
        bundleData,
      );
      row.bundleUrl = bundleName;
      row.bundleHash = crypto.createHash('sha256').update(bundleData).digest('hex').slice(0, 16);
      row.hash = row.bundleHash;
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
      const runtimeData = JSON.stringify(
        {
          manifest: runtimeManifest,
          files: { [runtimeName]: runtimeSource },
        },
        null,
        2,
      );
      await fs.writeFile(
        path.join(catalogDir, runtimeBundle),
        runtimeData,
      );
      row.runtimeBundleUrl = runtimeBundle;
      row.runtimeBundleHash = crypto.createHash('sha256').update(runtimeData).digest('hex').slice(0, 16);
      wrote = true;
    } catch (err) {
      console.warn(`Could not read runtime entry for ${entry.name}: ${err.message}`);
    }
  }

  // Auto-generate theme preview screenshots from palette metadata when missing.
  if (wrote && row.id && isThemeManifest(manifest) && row.preview && !row.screenshot) {
    const shotName = `${entry.name}.svg`;
    const svg = buildThemePreviewSvg({
      ...row.preview,
      label: row.name,
      style: row.style,
      name: row.name,
    });
    await fs.writeFile(path.join(screenshotsDir, shotName), svg);
    row.screenshot = `screenshots/${shotName}`;
  } else if (
    wrote &&
    row.id &&
    typeof row.screenshot === "string" &&
    row.screenshot.endsWith(".svg") &&
    row.preview
  ) {
    // Keep generated SVG in sync when preview colors change.
    const base = path.basename(row.screenshot);
    const svg = buildThemePreviewSvg({
      ...row.preview,
      label: row.name,
      style: row.style,
      name: row.name,
    });
    await fs.writeFile(path.join(screenshotsDir, base), svg);
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
