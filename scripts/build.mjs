// build.mjs — registry-driven. Walks every product, merges each edition's
// generated data + authored flow into the SIGNED artifact the IDE pulls, under
// dist/<product>/<edition>.json, with a global dist/index.json catalog.
//
// The IDE pulls dist/index.json → discovers products+editions → pulls the specific
// dist/<product>/<edition>.json, verifies its signature + schemaVersion, then
// interprets the flow. (Signing stubbed; use real asymmetric signing in prod.)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SCHEMA_VERSION = '1.0';
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8'));

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const index = { schemaVersion: SCHEMA_VERSION, generatedAt: new Date().toISOString(), products: {} };

for (const [productId, entry] of Object.entries(registry.products)) {
	if (entry.status !== 'active') { index.products[productId] = { status: entry.status, label: entry.label }; continue; }
	const dir = path.join(ROOT, entry.path);
	const product = JSON.parse(fs.readFileSync(path.join(dir, 'product.json'), 'utf8'));
	const outDir = path.join(DIST, productId);
	fs.mkdirSync(outDir, { recursive: true });

	const editions = {};
	for (const [edition, map] of Object.entries(product.editions)) {
		const dataPath = path.join(dir, 'generated', `${edition}.json`);
		if (!fs.existsSync(dataPath)) continue;
		const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
		const flowPath = map.flow ? path.join(dir, map.flow) : null;
		const flow = flowPath && fs.existsSync(flowPath) ? JSON.parse(fs.readFileSync(flowPath, 'utf8')) : null;

		const artifact = { product: productId, edition, schemaVersion: SCHEMA_VERSION, data, flow };
		const body = JSON.stringify(artifact, null, 2);
		const sha = crypto.createHash('sha256').update(body).digest('hex');
		const signed = { ...artifact, _integrity: { sha256: sha, signature: `STUB:${sha.slice(0, 16)}` } };
		fs.writeFileSync(path.join(outDir, `${edition}.json`), JSON.stringify(signed, null, 2) + '\n');
		editions[edition] = { sha256: sha, minEngineVersion: flow?.minEngineVersion ?? '0.1.0', latest: data.latest };
	}
	index.products[productId] = { status: 'active', label: entry.label, editions };
}

fs.writeFileSync(path.join(DIST, 'index.json'), JSON.stringify(index, null, 2) + '\n');
const active = Object.values(index.products).filter(p => p.status === 'active').length;
console.log(`built dist/ for ${active} active product(s) @ schema ${SCHEMA_VERSION}`);
