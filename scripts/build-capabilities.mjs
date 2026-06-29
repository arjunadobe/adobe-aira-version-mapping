// build-capabilities.mjs — bundles the capability manifests in capabilities/ into signed
// per-stack dist/<stack>/capabilities.json, INLINING each file template's body as `content`
// (so the IDE fetches one artifact per stack and writes files verbatim, ${field}-interpolated)
// — exactly like build-generators.mjs does for generators.
//
// Templates: capabilities here are lifted from the Class-C generators, so their templates are
// resolved from the generator tree (products/<product>/generators/templates/<tail>/<template>),
// NOT duplicated. product = id.split('.')[0], tail = id.split('.').slice(1).join('-') — the
// same convention build-generators uses. A direct-authored capability can later own a
// capabilities/templates/ dir; the resolver falls back to a MISSING marker if absent.
// Run: npm run build:capabilities  (or via npm run build)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CAP_DIR = path.join(ROOT, 'capabilities');
const SCHEMA_VERSION = '1.0';

if (!fs.existsSync(CAP_DIR)) { console.log('no capabilities/ dir — nothing to build'); process.exit(0); }

function inlineTemplate(cap, file) {
	const product = cap.id.split('.')[0];
	const tail = cap.id.split('.').slice(1).join('-');
	const tplDir = path.join(ROOT, 'products', product, 'generators', 'templates', tail);
	const direct = path.join(tplDir, file.template);
	let content = '';
	if (fs.existsSync(direct)) { content = fs.readFileSync(direct, 'utf8'); }
	else { const found = findTemplate(path.join(ROOT, 'products', product, 'generators', 'templates'), file.template); content = found ? fs.readFileSync(found, 'utf8') : `/* MISSING TEMPLATE: ${file.template} */`; }
	const out = { path: file.path, merge: !!file.merge, content };
	if (file.xmlMerge) { out.xmlMerge = file.xmlMerge; }
	return out;
}

function findTemplate(dir, name) {
	if (!fs.existsSync(dir)) { return null; }
	for (const sub of fs.readdirSync(dir)) { const p = path.join(dir, sub, name); if (fs.existsSync(p)) { return p; } }
	return null;
}

const byStack = {};
let total = 0;
for (const f of fs.readdirSync(CAP_DIR).filter(f => f.endsWith('.json'))) {
	const cap = JSON.parse(fs.readFileSync(path.join(CAP_DIR, f), 'utf8'));
	if (cap.kind !== 'capability') { continue; }
	cap.files = (cap.files || []).map(file => inlineTemplate(cap, file));
	for (const stack of (cap.appliesToStacks || [])) { (byStack[stack] ||= []).push(cap); }
	total++;
}

for (const [stack, capabilities] of Object.entries(byStack)) {
	const artifact = { stack, schemaVersion: SCHEMA_VERSION, capabilities };
	const body = JSON.stringify(artifact, null, 2);
	const sha = crypto.createHash('sha256').update(body).digest('hex');
	const signed = { ...artifact, _integrity: { sha256: sha, signature: `STUB:${sha.slice(0, 16)}` } };
	fs.mkdirSync(path.join(DIST, stack), { recursive: true });
	fs.writeFileSync(path.join(DIST, stack, 'capabilities.json'), JSON.stringify(signed, null, 2) + '\n');
}
console.log(`built capabilities: ${total} manifest(s) across ${Object.keys(byStack).length} stack(s) [${Object.keys(byStack).join(', ')}]`);
