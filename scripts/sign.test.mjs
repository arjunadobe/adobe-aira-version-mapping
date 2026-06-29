// Unit test for sign.mjs -- sign->verify roundtrip with an in-test ed25519 keypair, plus
// tamper-fail and wrong-key-fail. Run: node --test scripts/sign.test.mjs
//
// The keypair is generated IN-MEMORY per test (crypto.generateKeyPairSync('ed25519')); no key
// is ever written to disk or committed. This proves the signing machinery, NOT a real key.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { canonicalBody, signArtifact, signCanonical, verifyCanonical } from './sign.mjs';

test('sign -> verify roundtrip over the canonical body (sha256 preserved)', () => {
	const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
	const artifact = { stack: 'eds', schemaVersion: '1.0', capabilities: [{ id: 'x' }], _integrity: { sha256: 'preserved-sha', signature: 'STUB:preserved' } };
	const signed = signArtifact(artifact, privateKey);
	assert.match(signed._integrity.signature, /^ed25519:/);
	assert.equal(signed._integrity.sha256, 'preserved-sha'); // sha256 carried over, not recomputed
	assert.ok(verifyCanonical(canonicalBody(signed), signed._integrity.signature, publicKey));
});

test('index-style object without _integrity gets sha256 + signature added', () => {
	const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
	const index = { schemaVersion: '1.0', products: { eds: { status: 'active' } } };
	const signed = signArtifact(index, privateKey);
	assert.equal(typeof signed._integrity.sha256, 'string');
	assert.ok(verifyCanonical(canonicalBody(signed), signed._integrity.signature, publicKey));
});

test('tamper-fail: a byte changed in the body fails verification', () => {
	const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
	const signed = signArtifact({ stack: 'eds', capabilities: [{ id: 'x' }] }, privateKey);
	const tampered = canonicalBody(signed).replace('"x"', '"evil"');
	assert.equal(verifyCanonical(tampered, signed._integrity.signature, publicKey), false);
});

test('wrong-key-fail: a signature from another key does not verify', () => {
	const { privateKey } = crypto.generateKeyPairSync('ed25519');
	const { publicKey: otherPub } = crypto.generateKeyPairSync('ed25519');
	const signed = signArtifact({ stack: 'eds', capabilities: [] }, privateKey);
	assert.equal(verifyCanonical(canonicalBody(signed), signed._integrity.signature, otherPub), false);
});

test('non-ed25519 / STUB signature is not accepted by verifyCanonical', () => {
	const { publicKey } = crypto.generateKeyPairSync('ed25519');
	assert.equal(verifyCanonical('{}', 'STUB:abc', publicKey), false);
	assert.equal(verifyCanonical('{}', undefined, publicKey), false);
});

test('signCanonical is deterministic for ed25519 (same body -> same signature)', () => {
	const { privateKey } = crypto.generateKeyPairSync('ed25519');
	const body = JSON.stringify({ a: 1 }, null, 2);
	assert.equal(signCanonical(body, privateKey), signCanonical(body, privateKey));
});
