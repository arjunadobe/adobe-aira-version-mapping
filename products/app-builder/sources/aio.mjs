// Source module: Adobe App Builder — the aio toolchain baseline.
//
// App Builder has NO Magento-style version matrix. What the registry carries is the
// TOOLCHAIN baseline (local Node requirement + latest aio CLI + I/O Runtime action
// runtimes + starter templates). The user-specific org → project → workspace cascade
// is NOT registry data — it's fetched live from `aio console` at wizard time.
//
// Source of truth = the **npm registry** (public, no auth, machine-readable):
//   - @adobe/aio-cli      -> latest version + engines.node (the local Node floor)
//   - @adobe/aio-cli-plugin-app -> the app plugin powering `aio app init`
// Adobe I/O Runtime's supported action runtimes (nodejs:20/18) change slowly and are
// taken from Adobe's runtime docs; kept here as a small curated list, refreshed when
// the aio-cli engines change.

import crypto from 'node:crypto';

export const SOURCE_REPO = 'npm:@adobe/aio-cli';
const NPM = 'https://registry.npmjs.org';

async function getJson(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'aira-registry' } });
	if (!res.ok) throw new Error(`${url} -> ${res.status}`);
	return res.json();
}

/** Change-detection: the aio-cli dist integrity + the app plugin version. */
export async function headSha() {
	const cli = await getJson(`${NPM}/@adobe/aio-cli/latest`);
	const app = await getJson(`${NPM}/@adobe/aio-cli-plugin-app/latest`).catch(() => ({ version: '?' }));
	return crypto.createHash('sha256').update(`${cli.version}|${cli.engines?.node}|${app.version}`).digest('hex');
}

export async function scrape() {
	const cli = await getJson(`${NPM}/@adobe/aio-cli/latest`);
	const node = cli.engines?.node || '>=20';
	// Adobe I/O Runtime supported action runtimes (curated; aligned to the aio-cli line).
	const runtimes = ['nodejs:20', 'nodejs:18'];
	// The canonical `aio app init` starters.
	const templates = [
		'@adobe/generator-app-builder',
		'@adobe/generator-app-api-mesh',
		'@adobe/generator-app-events-generic',
	];
	return {
		latest: 'current',
		versions: {
			current: {
				line: 'current',
				node,
				aioCli: cli.version,
				runtimes,
				templates,
				sourceRef: `npm:@adobe/aio-cli@${cli.version}`,
				immutable: false,
			},
		},
	};
}
