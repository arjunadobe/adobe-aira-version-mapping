// build-migration.mjs -- bundles the migration data file(s) in migration/ into signed
// dist/migration/<name>.json, mirroring build-stacks.mjs. Currently the single
// migration/adobe-equivalents.json (the 3rd-party -> Adobe-native equivalent map the AIRA
// migrate profiler consumes for 3rd-party->REPLACE). The sha256 (and, in CI, the ed25519
// signature from sign.mjs) cover the CANONICAL body -- the manifest WITHOUT _integrity --
// exactly like the stacks + capabilities artifacts.
// Run: npm run build:migration  (or via npm run build, before sign.mjs)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const MIGRATION_DIR = path.join(ROOT, 'migration');

if (!fs.existsSync(MIGRATION_DIR)) { console.log('no migration/ dir -- nothing to build'); process.exit(0); }

let count = 0;
for (const f of fs.readdirSync(MIGRATION_DIR).filter(f => f.endsWith('.json'))) {
	const manifest = JSON.parse(fs.readFileSync(path.join(MIGRATION_DIR, f), 'utf8'));
	if (manifest.kind !== 'migration-equivalents' || !Array.isArray(manifest.equivalents)) { console.warn(`skip ${f}: not a migration-equivalents manifest`); continue; }
	// The canonical body the integrity covers = the manifest as-authored (no _integrity field).
	const body = JSON.stringify(manifest, null, 2);
	const sha = crypto.createHash('sha256').update(body).digest('hex');
	const signed = { ...manifest, _integrity: { sha256: sha, signature: `STUB:${sha.slice(0, 16)}` } };
	fs.mkdirSync(path.join(DIST, 'migration'), { recursive: true });
	fs.writeFileSync(path.join(DIST, 'migration', f), JSON.stringify(signed, null, 2) + '\n');
	count++;
}
console.log(`built migration: ${count} manifest(s) [${fs.readdirSync(MIGRATION_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).join(', ')}]`);
