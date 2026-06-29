// sign.mjs -- ed25519-sign the built dist/ artifacts. Runs AFTER build (chained into
// `npm run build`). When AIRA_REGISTRY_SIGNING_KEY is set (a PEM or base64 ed25519 private
// key), every dist/**/*.json gets a real detached signature over the SAME canonical body the
// sha256 already covers (JSON.stringify(artifact-without-_integrity, null, 2)), stored as
// _integrity.signature = "ed25519:<base64>". When the env var is ABSENT the STUB signatures
// are left untouched (an unsigned build) -- so local/dev builds keep working and only CI with
// the secret produces signed artifacts. node crypto does ed25519 natively (no dependency).
//
// SECURITY: the private key lives ONLY in the env var (a CI secret) -- never read from disk,
// never written anywhere, never logged.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ENV_KEY = 'AIRA_REGISTRY_SIGNING_KEY';
const PREFIX = 'ed25519:';

/** The canonical body the signature (and the sha256) cover: the artifact WITHOUT _integrity,
 *  2-space pretty-printed, no trailing newline. Mirrors the IDE's canonicalArtifactBody. */
export function canonicalBody(obj) {
	const { _integrity, ...rest } = obj;
	void _integrity;
	return JSON.stringify(rest, null, 2);
}

/** Accept a PEM, a base64-wrapped PEM, or base64 DER (PKCS8). Returns a KeyObject. */
export function loadPrivateKey(raw) {
	const s = String(raw ?? '').trim();
	if (!s) { throw new Error(`${ENV_KEY} is empty`); }
	if (s.includes('BEGIN')) { return crypto.createPrivateKey(s); }
	const buf = Buffer.from(s, 'base64');
	const asText = buf.toString('utf8');
	if (asText.includes('BEGIN')) { return crypto.createPrivateKey(asText); }
	return crypto.createPrivateKey({ key: buf, format: 'der', type: 'pkcs8' });
}

/** Detached ed25519 signature over the canonical body, as "ed25519:<base64>". */
export function signCanonical(canonical, privateKey) {
	const sig = crypto.sign(null, Buffer.from(canonical, 'utf8'), privateKey);
	return `${PREFIX}${sig.toString('base64')}`;
}

/** Verify an "ed25519:<base64>" signature over the canonical body. False on any error. */
export function verifyCanonical(canonical, signatureField, publicKey) {
	if (typeof signatureField !== 'string' || !signatureField.startsWith(PREFIX)) { return false; }
	try {
		const sig = Buffer.from(signatureField.slice(PREFIX.length), 'base64');
		return crypto.verify(null, Buffer.from(canonical, 'utf8'), publicKey, sig);
	} catch {
		return false;
	}
}

/** Sign one parsed artifact: preserve its sha256 (compute it when absent, e.g. index.json),
 *  replace the signature with a real ed25519 one. Returns a fresh object (_integrity last,
 *  so re-canonicalizing is byte-stable). */
export function signArtifact(obj, privateKey) {
	const { _integrity, ...rest } = obj;
	const canonical = JSON.stringify(rest, null, 2);
	const sha256 = _integrity?.sha256 ?? crypto.createHash('sha256').update(canonical).digest('hex');
	return { ...rest, _integrity: { sha256, signature: signCanonical(canonical, privateKey) } };
}

function walkJson(dir) {
	const out = [];
	if (!fs.existsSync(dir)) { return out; }
	for (const name of fs.readdirSync(dir)) {
		const full = path.join(dir, name);
		const stat = fs.statSync(full);
		if (stat.isDirectory()) { out.push(...walkJson(full)); }
		else if (name.endsWith('.json')) { out.push(full); }
	}
	return out;
}

export function main() {
	const raw = process.env[ENV_KEY];
	if (!raw) {
		console.log(`[sign] ${ENV_KEY} not set -- leaving STUB signatures unchanged (unsigned build).`);
		return;
	}
	const key = loadPrivateKey(raw);
	const files = walkJson(DIST);
	let signed = 0;
	for (const file of files) {
		const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
		fs.writeFileSync(file, JSON.stringify(signArtifact(obj, key), null, 2) + '\n');
		signed++;
	}
	console.log(`[sign] ed25519-signed ${signed} dist artifact(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { main(); }
