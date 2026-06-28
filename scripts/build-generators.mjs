// build-generators.mjs — bundles each product's Class B/C generators into a single
// signed dist/<product>/generators.json, INLINING each file template's body as
// `content` (so the IDE fetches one artifact per product and writes files verbatim,
// ${field}-interpolated). Run: npm run build:generators  (or via npm run build)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SCHEMA_VERSION = '1.0';
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8'));

let total = 0;
for (const [productId, entry] of Object.entries(registry.products)) {
	if (entry.status !== 'active') continue;
	const genDir = path.join(ROOT, entry.path, 'generators');
	if (!fs.existsSync(genDir)) continue;

	const generators = [];
	for (const file of fs.readdirSync(genDir).filter(f => f.endsWith('.gen.json'))) {
		const gen = JSON.parse(fs.readFileSync(path.join(genDir, file), 'utf8'));
		// inline each template body
		gen.files = gen.files.map(f => {
			const tplPath = path.join(genDir, 'templates', gen.id.split('.').slice(1).join('-'), f.template);
			// also accept templates/<basename-of-template-dir>/...; resolve by the gen folder convention
			const altDir = path.join(genDir, 'templates');
			let content = '';
			if (fs.existsSync(tplPath)) content = fs.readFileSync(tplPath, 'utf8');
			else {
				// fallback: find <something>/<template> under templates/
				const found = findTemplate(altDir, f.template);
				content = found ? fs.readFileSync(found, 'utf8') : `/* MISSING TEMPLATE: ${f.template} */`;
			}
			const out = { path: f.path, merge: !!f.merge, content };
			if (f.xmlMerge) out.xmlMerge = f.xmlMerge;   // XML node-insert spec (passthrough)
			return out;
		});
		generators.push(gen);
		total++;
	}
	if (generators.length === 0) continue;

	const artifact = { product: productId, schemaVersion: SCHEMA_VERSION, generators };
	const body = JSON.stringify(artifact, null, 2);
	const sha = crypto.createHash('sha256').update(body).digest('hex');
	const signed = { ...artifact, _integrity: { sha256: sha, signature: `STUB:${sha.slice(0, 16)}` } };
	fs.mkdirSync(path.join(DIST, productId), { recursive: true });
	fs.writeFileSync(path.join(DIST, productId, 'generators.json'), JSON.stringify(signed, null, 2) + '\n');
}
console.log(`built generators for ${total} generator(s) across active products`);

function findTemplate(dir, name) {
	if (!fs.existsSync(dir)) return null;
	for (const sub of fs.readdirSync(dir)) {
		const p = path.join(dir, sub, name);
		if (fs.existsSync(p)) return p;
	}
	return null;
}
