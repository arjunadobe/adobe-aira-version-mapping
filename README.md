# adobe-aira-version-mapping

The **registry** that AIRA's scaffold engine reads. It turns Adobe's public source
repos into normalized, signed, versioned data + reviewed flows — so the IDE ships
**zero** version knowledge and never hardcodes anything.

> Design reference: `aira-oss/scaffold-design/docs/FINAL-DESIGN.md`.

## What lives here (and who writes it)

| Path | Written by | Edited by humans? |
|---|---|---|
| `generated/` | the scraper (`scripts/refresh.mjs`) | **NO** — machine-only, CI-enforced |
| `flows/` | us (authored decision graphs) | yes — reviewed PRs |
| `schema/` | us | yes — the contract |
| `scripts/` | us | yes — the scraper + gates |
| `dist/` | the build (`scripts/build.mjs`) | **NO** — what the IDE pulls |

The single most important rule: **`generated/` is never hand-edited.** A human
typing a PHP version here recreates the hardcoded feed we deleted. CI fails any PR
that touches `generated/` without a matching scraper run.

## Folder structure — per-product folders + a top-level mapping

Each Adobe product is a **self-contained folder** under `products/<id>/` with the
SAME shape. The shared engine (`scripts/`) is product-agnostic — it reads the
mapping and iterates. **Adding a product = a new folder + one entry in
`registry.json`. No engine change.**

```
adobe-aira-version-mapping/
├── registry.json                    # TOP-LEVEL MAPPING: product → folder → status
├── schema/                          # shared CONTRACT (validation + IDE parsing)
│   ├── edition-data.schema.json · flow.schema.json · meta.schema.json
│
├── products/
│   ├── commerce/                    # ── active ──
│   │   ├── product.json             #   editions → source + flow; requirement/extension sources
│   │   ├── sources/                 #   the scrapers
│   │   │   ├── experience-league.mjs  #   RICHEST: per-patch php/composer/services (default)
│   │   │   ├── magento-cloud.mjs       #   GitHub YAML (per-line, cross-check)
│   │   │   └── magento2.mjs            #   GitHub tags + composer.json (ext-* list)
│   │   ├── generated/               #   MACHINE-WRITTEN — adobe-commerce-cloud/onprem, magento-oss + _meta
│   │   └── flows/                   #   AUTHORED — the wizard graphs
│   ├── aem/          (planned — product.json stub; add sources/generated/flows to activate)
│   ├── app-builder/  (planned)
│   └── eds/          (planned)
│
├── scripts/                         # SHARED engine, registry-driven
│   ├── refresh.mjs                  #   walk products → poll → diff → scrape → validate → write
│   ├── validate.mjs                 #   schema + sanity gate (the safety net)
│   └── build.mjs                    #   merge data+flow → dist/<product>/<edition>.json, sign
│
├── dist/                            # what the IDE pulls (built + signed)
│   ├── index.json                   #   global catalog: products · editions · schemaVersion · hashes
│   └── <product>/<edition>.json     #   merged data+flow, signed
│
└── .github/workflows/refresh.yml    # cron every 4h: poll → if changed, open PR
```

### The two-level mapping

- **`registry.json`** — product → folder + status. The catalog the engine and IDE
  discover products from.
- **`products/<id>/product.json`** — edition → source module + flow. Cloud + on-prem
  + OSS share the requirement source (same version/service matrix); they differ only
  in flow.

### Requirement sources (Commerce)

| Source | Gives | Granularity | Stability |
|---|---|---|---|
| **Experience League** (default) | php · composer · OpenSearch · MariaDB/MySQL · RabbitMQ · Valkey/Redis · nginx | **per-patch** (2.4.8-p5 …) | docs scrape — richer, slightly fragile |
| `magento-cloud` (GitHub) | php · composer · ext · services | per-line | machine-readable YAML — stable |
| `magento2` (GitHub) | php · **ext-\*** | per-tag | machine-readable — stable |

EL is the richest (it's literally Adobe's published matrix); GitHub YAML is the
stable cross-check the validate gate compares against. Neither is hardcoded — both
are scraped from Adobe's own published sources.

## How it stays fresh (dynamic + fast, never hand-typed)

```
every ~4h (GitHub Action):
  1. each source module GETs its upstream repo's latest commit SHA   (one call, no download)
  2. compare to generated/_meta.json
  3. unchanged → exit 0, do nothing
  4. changed   → scrape changed refs → normalize → VALIDATE → write generated/
              → open a PR (human review) — or auto-merge on green for trusted diffs
  5. on merge  → build.mjs merges generated+flows → signs → dist/
```

It *checks* on a timer but *pulls* only on a real change. The `validate.mjs` gate
means a renamed branch or schema break fails the job (and pages a human) instead of
shipping breakage to every IDE.

## Sources of truth (public, no auth, no composer)

| Edition | Source repo | Versions | Requirements |
|---|---|---|---|
| Adobe Commerce Cloud / on-prem | `magento/magento-cloud` | branches (incl. patch ranges) | `.magento.app.yaml` (php/composer/ext) + `.magento/services.yaml` (db/search/cache) |
| Open Source | `magento/magento2` | tags | root `composer.json` (php/ext) |

Per-ref data is immutable, so it's cached forever; only the *list* of versions
needs a short TTL.

## What the IDE consumes

The IDE pulls **only `dist/`** — never `generated/` + `flows/` separately. It reads
`dist/index.json` (catalog + `schemaVersion` + cache etags), then
`dist/<edition>.json` (merged data + flow, signed). The IDE verifies the signature
and checks `schemaVersion` against what its engine supports before interpreting.

## Guardrails

1. **Generated ≠ authored** — CI rejects hand-edits to `generated/`.
2. **Signed `dist/`** — the IDE runs flow commands, so the artifact is a supply-chain
   surface; everything served is signed and the IDE verifies it.
3. **Schema-versioned** — `dist/index.json.schemaVersion` + each flow's
   `minEngineVersion` keep older IDEs safe from newer flows.
4. **Validate gate** — nothing reaches `dist/` without passing `validate.mjs`.
```
