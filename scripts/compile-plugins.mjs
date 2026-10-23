#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = path.join(root, "plugins");

const HOST_SPEC = /^(react|react-dom|react\/.*|@readergo\/plugin-sdk(\/.*)?|@\/.*|jszip|lucide-react)$/;

function isHostSpec(spec) {
  return HOST_SPEC.test(spec);
}

function bindingList(namedClause) {
  return namedClause.replace(/(\w+)\s+as\s+(\w+)/g, '$1: $2');
}

function rewriteClause(clause, expr) {
  const star = clause.match(/^\*\s+as\s+(\w+)$/);
  if (star) return `const ${star[1]} = ${expr};`;
  const namedAndDefault = clause.match(/^(\w+)\s*,\s*\{([\s\S]*)\}$/);
  if (namedAndDefault) {
    return `const ${namedAndDefault[1]} = ${expr}.default ?? ${expr};\nconst { ${bindingList(namedAndDefault[2].trim())} } = ${expr};`;
  }
  const named = clause.match(/^\{([\s\S]*)\}$/);
  if (named) return `const { ${bindingList(named[1].trim())} } = ${expr};`;
  const def = clause.match(/^(\w+)$/);
  if (def) return `const ${def[1]} = ${expr}.default ?? ${expr};`;
  throw new Error(`Unsupported import clause: ${clause}`);
}

export function rewriteHostImports(code) {
  return code.replace(
    /import\s*([\s\S]*?)\s*from\s*(['"])([^'"]+)\2\s*;?/g,
    (full, clause, _quote, spec) => {
      if (!isHostSpec(spec)) return full;
      const expr = `__readergoModule(${JSON.stringify(spec)})`;
      return rewriteClause(clause.trim(), expr);
    },
  );
}

function hostExternalPlugin() {
  return {
    name: "readergo-host-externals",
    setup(build) {
      build.onResolve({ filter: HOST_SPEC }, (args) => ({
        path: args.path,
        external: true,
      }));
    },
  };
}

function wrapUiEntry(code) {
  const match = code.match(/^export\s*\{([\s\S]*?)\}\s*;?/m);
  if (!match) {
    throw new Error("Compiled UI plugin is missing an export block");
  }
  const fields = match[1]
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return "";
      const alias = trimmed.match(/^(\w+)\s+as\s+(\w+)$/);
      if (alias) return `${alias[2]}: ${alias[1]}`;
      if (!/^\w+$/.test(trimmed)) {
        throw new Error(`Unsupported plugin export: ${trimmed}`);
      }
      return `${trimmed}: ${trimmed}`;
    })
    .filter(Boolean);
  const body = code.replace(match[0], "");
  return `export function __readergoStart(host) {
  const __readergoModule = (id) => {
    if (!host || typeof host.module !== "function") {
      throw new Error("ReaderGo plugin host is not installed");
    }
    return host.module(id);
  };
${body}
  return { ${fields.join(", ")} };
}
`;
}

async function compileUi(entryPath, outfile) {
  await fs.mkdir(path.dirname(outfile), { recursive: true });
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [entryPath],
    outfile,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    jsx: "automatic",
    minify: false,
    sourcemap: false,
    plugins: [hostExternalPlugin()],
    logLevel: "warning",
  });
  let code = await fs.readFile(outfile, "utf8");
  code = code.replace(/^\s*['"]use client['"];?\s*$/gm, "");
  code = rewriteHostImports(code);
  if (/from\s+['"](@\/|react|@readergo\/plugin-sdk)/.test(code)) {
    throw new Error(`${outfile} still imports a host module. The rewrite missed an import.`);
  }
  code = wrapUiEntry(code);
  if (code.includes("__READERGO_PLUGIN_HOST__")) {
    throw new Error(`${outfile} still reads the plugin host during module evaluation.`);
  }
  code = code.replaceAll("\u2014", "-");
  await fs.writeFile(outfile, code);
}

async function compileRuntime(entryPath, outfile) {
  await fs.mkdir(path.dirname(outfile), { recursive: true });
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [entryPath],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: ["node20"],
    external: ["ssh2", "@readergo/plugin-contracts", "@readergo/*"],
    minify: false,
    sourcemap: false,
    logLevel: "warning",
  });
}

async function compileManifest(manifestPath) {
  const pluginDir = path.dirname(manifestPath);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (!manifest.compile) return;
  if (manifest.compile.ui) {
    const entryPath = path.resolve(pluginDir, manifest.compile.ui);
    const outfile = path.join(pluginDir, "dist/ui.js");
    await compileUi(entryPath, outfile);
    manifest.main = "dist/ui.js";
  }
  if (manifest.compile.runtime) {
    const entryPath = path.resolve(pluginDir, manifest.compile.runtime);
    const outfile = path.join(pluginDir, "dist/runtime.mjs");
    await compileRuntime(entryPath, outfile);
    manifest.components = { ...(manifest.components || {}), runtime: "./dist/runtime.mjs" };
  }
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

async function main() {
  const folders = await fs.readdir(pluginsDir, { withFileTypes: true });
  let count = 0;
  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    const manifestPath = path.join(pluginsDir, folder.name, "manifest.json");
    try {
      await fs.access(manifestPath);
    } catch {
      continue;
    }
    await compileManifest(manifestPath);
    console.log(`Compiled plugin: ${folder.name}`);
    count++;
  }
  console.log(`Successfully compiled ${count} plugins`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
