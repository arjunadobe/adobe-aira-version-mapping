// build-stacks.mjs -- bundles the stack manifests in stacks/ into per-stack dist/<stackId>/stack.json,
// mirroring build-capabilities.mjs. Each stacks/<id>.json is a self-contained `stack` manifest
// (kind/stackId/label/buildGuidance/scaffold/preview) consumed by the AIRA conductor's getStack
// client. The sha256 (and, in CI, the ed25519 signature from sign.mjs) cover the CANONICAL body --
// the manifest WITHOUT _integrity -- exactly like the capabilities artifacts.
// Run: npm run build:stacks  (or via npm run build, before sign.mjs)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const STACK_DIR = path.join(ROOT, 'stacks');

if (!fs.existsSync(STACK_DIR)) { console.log('no stacks/ dir -- nothing to build'); process.exit(0); }

let count = 0;
for (const f of fs.readdirSync(STACK_DIR).filter(f => f.endsWith('.json'))) {
	const manifest = JSON.parse(fs.readFileSync(path.join(STACK_DIR, f), 'utf8'));
	if (manifest.kind !== 'stack' || !manifest.stackId) { console.warn(`skip ${f}: not a stack manifest`); continue; }
	// The canonical body the integrity covers = the manifest as-authored (no _integrity field).
	const body = JSON.stringify(manifest, null, 2);
	const sha = crypto.createHash('sha256').update(body).digest('hex');
	const signed = { ...manifest, _integrity: { sha256: sha, signature: `STUB:${sha.slice(0, 16)}` } };
	fs.mkdirSync(path.join(DIST, manifest.stackId), { recursive: true });
	fs.writeFileSync(path.join(DIST, manifest.stackId, 'stack.json'), JSON.stringify(signed, null, 2) + '\n');
	count++;
}
console.log(`built stacks: ${count} manifest(s) [${fs.readdirSync(STACK_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).join(', ')}]`);
