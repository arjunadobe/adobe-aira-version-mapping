// The refresh job — registry-driven. Reads registry.json, walks every ACTIVE
// product, loads each edition's source module by the path in product.json, checks
// the upstream SHA, and regenerates ONLY on change. Product-agnostic: a new
// product is a folder + a registry entry, never an engine edit.
//
// Run: npm run refresh   (CI runs it on a cron; see .github/workflows/refresh.yml)

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { validateAll } from './validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const registry = readJson(path.join(ROOT, 'registry.json'));

// --force ignores the stored SHAs and re-scrapes everything (full regenerate).
const FORCE = process.argv.includes('--force');

let changed = false;

for (const [productId, entry] of Object.entries(registry.products)) {
	if (entry.status !== 'active') { console.log(`· ${productId}: ${entry.status} — skipped`); continue; }
	const productDir = path.join(ROOT, entry.path);
	const product = readJson(path.join(productDir, 'product.json'));
	const genDir = path.join(productDir, 'generated');
	fs.mkdirSync(genDir, { recursive: true });
	const meta = fileExists(path.join(genDir, '_meta.json')) ? readJson(path.join(genDir, '_meta.json')) : { sources: {} };

	// Dedupe: many editions share one source module — scrape each source once.
	const sourcesSeen = new Map();
	for (const [edition, map] of Object.entries(product.editions)) {
		const srcRel = map.source;
		try {
			if (!sourcesSeen.has(srcRel)) {
				const mod = await import(pathToFileURL(path.join(productDir, srcRel)).href);
				sourcesSeen.set(srcRel, { mod, result: null, sha: null });
			}
			const s = sourcesSeen.get(srcRel);
			const upstreamSha = s.sha ?? (s.sha = await s.mod.headSha());
			const knownSha = meta.sources[edition]?.sha;
			if (!FORCE && upstreamSha === knownSha) { console.log(`= ${productId}/${edition}: unchanged`); continue; }

			console.log(`~ ${productId}/${edition}: regenerating from ${srcRel}${FORCE ? ' (forced)' : ''}`);
			if (!s.result) s.result = await s.mod.scrape();
			const data = {
				_meta: { product: productId, edition, source: s.mod.SOURCE_REPO ?? srcRel, sourceSha: upstreamSha, generatedAt: new Date().toISOString(), schemaVersion: registry.schemaVersion },
				latest: s.result.latest,
				versions: s.result.versions,
			};
			fs.writeFileSync(path.join(genDir, `${edition}.json`), JSON.stringify(data, null, 2) + '\n');
			meta.sources[edition] = { sha: upstreamSha };
			changed = true;
		} catch (err) {
			// Network / rate-limit / source error: keep the last-known generated file,
			// never crash the whole run or zero out good data.
			const has = fs.existsSync(path.join(genDir, `${edition}.json`));
			console.warn(`! ${productId}/${edition}: source failed (${err.message}). ${has ? 'Keeping last-known data.' : 'NO prior data — gap!'}`);
		}
	}
	meta.generatedAt = new Date().toISOString();
	fs.writeFileSync(path.join(genDir, '_meta.json'), JSON.stringify(meta, null, 2) + '\n');
}

if (!changed) { console.log('No upstream changes. Done.'); process.exit(0); }

const errors = validateAll(ROOT);
if (errors.length) {
	console.error('VALIDATION FAILED — not publishing:\n' + errors.map(e => '  - ' + e).join('\n'));
	process.exit(1);
}
console.log('Regenerated + validated. (CI opens a PR; build.mjs signs dist/ on merge.)');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function fileExists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
