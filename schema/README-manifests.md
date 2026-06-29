# Capability-manifest schemas (DRAFT — ahead of the engine)

These six schemas define the **dynamic capability layer** for AIRA's intent-to-delivery vision.
They are the machine-enforceable form of the contracts described in the design docs:

- `aira-oss/docs/design/aira-intent-to-delivery.md` (vision + architecture)
- `aira-oss/docs/design/aira-capability-manifests.md` (the manifest contracts, section by section)

| Schema | Manifest kind | Purpose | Design ref |
|---|---|---|---|
| `stack.schema.json` | `stack` | a delivery stack + its full lifecycle (scaffold/preview/deploy) | sec.2 |
| `capability.schema.json` | `capability` | Adobe-native drop-in / localization / personalization / analytics (generalized Class-C) | sec.3 |
| `archetype.schema.json` | `archetype` | OPTIONAL build prior (recipe); model-first fallback | sec.4 |
| `brand-theme.schema.json` | `brand-theme` | per-stack token→theme-variable mapping (brand kit stays per-project) | sec.5 |
| `source-adapter.schema.json` | `source-adapter` | how to read ONE source platform for migration (URL/folder) | sec.9a |
| `migration-mapping.schema.json` | `migration-mapping` | source→target concept map for the `migrate` mode | sec.9b |

Example instances live in `../examples/` (one per kind), validated against these schemas.

## Status

**DRAFT, ahead of the consuming engine.** The IDE engine that reads these manifests does not
exist yet (the conductor/router are unbuilt — see the roadmap in the vision doc). These schemas
define the *target contract* so implementation can build against a fixed shape.

They are **intentionally NOT yet wired into `scripts/validate.mjs`** (which validates the live
`edition-data` / `generator` artifacts), so the existing build is unaffected. When the engine
work starts, wire each schema into `validate.mjs` and begin shipping real manifests under
`dist/`. Per the project §0 rule, verify these shapes against the real engine seams before
locking them.
