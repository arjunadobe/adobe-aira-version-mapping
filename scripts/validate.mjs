// The safety gate — registry-driven. Walks every product's generated/ + flows/.
// A renamed upstream branch or a schema break fails HERE (and pages a human via
// CI) instead of shipping breakage to every IDE. Run: npm run validate

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function validateAll(root = path.resolve(__dirname, '..')) {
	const errors = [];
	const registry = JSON.parse(fs.readFileSync(path.join(root, 'registry.json'), 'utf8'));

	for (const [productId, entry] of Object.entries(registry.products)) {
		if (entry.status !== 'active') continue;
		const dir = path.join(root, entry.path);
		const genDir = path.join(dir, 'generated');
		const flowDir = path.join(dir, 'flows');

		if (!exists(genDir)) { errors.push(`${productId}: no generated/`); continue; }
		for (const file of fs.readdirSync(genDir).filter(f => f.endsWith('.json') && !f.startsWith('_'))) {
			const data = readJson(path.join(genDir, file), errors, `${productId}/${file}`);
			if (!data) continue;
			const n = Object.keys(data.versions ?? {}).length;
			if (n === 0) errors.push(`${productId}/${file}: zero versions (scrape likely broke)`);
			if (!data.latest) errors.push(`${productId}/${file}: missing 'latest'`);
			for (const [v, row] of Object.entries(data.versions ?? {})) {
				// product-agnostic: a row needs SOME runtime requirement (php for Commerce, node for App Builder/EDS)
				if (!row.php && !row.node) errors.push(`${productId}/${file}@${v}: missing a runtime requirement (php or node)`);
				if (!row.sourceRef) errors.push(`${productId}/${file}@${v}: missing sourceRef`);
			}
		}
		if (exists(flowDir)) {
			for (const file of fs.readdirSync(flowDir).filter(f => f.endsWith('.flow.json'))) {
				const flow = readJson(path.join(flowDir, file), errors, `${productId}/${file}`);
				if (!flow) continue;
				if (!flow.minEngineVersion) errors.push(`${productId}/${file}: missing minEngineVersion`);
				if (!Array.isArray(flow.actions) || flow.actions.length === 0) errors.push(`${productId}/${file}: no actions`);
			}
		}
	}
	return errors;
}

function readJson(p, errors, label) {
	try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
	catch (e) { errors.push(`${label}: invalid JSON (${e.message})`); return null; }
}
function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }

if (import.meta.url === `file://${process.argv[1]}`) {
	const errs = validateAll();
	if (errs.length) { console.error('FAIL:\n' + errs.map(e => '  - ' + e).join('\n')); process.exit(1); }
	console.log('validate: OK');
}
