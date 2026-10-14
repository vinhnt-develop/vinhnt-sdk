# Changesets

All 22 `@vinhnt-sdk/*` packages are versioned together via a **fixed group**
(see `config.json` → `"fixed": [["@vinhnt-sdk/*"]]`) — one version line for the
whole SDK, which resolves the S10 divergence (core 0.10.x, schema 0.5.x,
provider-spec 0.1.0, root 0.4.0 …).

## Workflow

1. `pnpm changeset` — describe your change (patch/minor/major) after each PR.
2. `pnpm version-packages` — `changeset version`: consumes `.changeset/*.md`,
   bumps **every** package to the same version + writes CHANGELOGs.
3. Sync `version` frontmatter of `docs/api/*.md` to the new version (release checklist).
4. `pnpm release` — `pnpm build && changeset publish` (npm, `--access public`).

Docs: https://github.com/changesets/changesets
