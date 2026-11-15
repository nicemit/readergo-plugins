# Packages

Host contracts (`@readergo/plugin-sdk`, `@readergo/plugin-contracts`) are not vendored here.

- Local: TypeScript paths in the repo root `tsconfig.json` point at `../readergo/packages/...`.
- Compile: those modules stay host externals (see `scripts/compile-plugins.mjs`).
- CI: does not need a host checkout to produce catalog bundles.
