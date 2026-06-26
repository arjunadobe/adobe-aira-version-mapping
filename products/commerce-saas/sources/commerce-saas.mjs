// Source module: Adobe Commerce SaaS — the out-of-process Commerce stack.
//
// COMPOSES App Builder (aio + API Mesh + I/O Events) and the EDS storefront
// (aem-cli + the commerce boilerplate + @dropins/storefront-*). NO PHP backend.
// Source of truth = npm (aio-cli + aem-cli). The storefront boilerplate repo is
// hlxsites/aem-boilerplate-commerce (its postinstall pulls the @dropins/* set).

import crypto from 'node:crypto';

export const SOURCE_REPO = 'npm:@adobe/aio-cli + @adobe/aem-cli';
const NPM = 'https://registry.npmjs.org';

// The EDS commerce storefront boilerplate (FULL org/repo — note hlxsites, not adobe).
const STOREFRONT_BOILERPLATE = 'hlxsites/aem-boilerplate-commerce';
// The drop-in storefront components the boilerplate wires (for reference / Class C).
const DROPINS = [
	'@dropins/storefront-pdp', '@dropins/storefront-product-discovery',
	'@dropins/storefront-cart', '@dropins/storefront-checkout',
	'@dropins/storefront-account', '@dropins/storefront-order',
	'@dropins/storefront-recommendations',
];
// The App Builder side starters.
const APP_STARTERS = ['@adobe/generator-app-api-mesh', '@adobe/generator-app-events-generic'];

async function getJson(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'aira-registry' } });
	if (!res.ok) throw new Error(`${url} -> ${res.status}`);
	return res.json();
}

/** Change-detection: both toolchain versions. */
export async function headSha() {
	const aio = await getJson(`${NPM}/@adobe/aio-cli/latest`);
	const aem = await getJson(`${NPM}/@adobe/aem-cli/latest`);
	return crypto.createHash('sha256').update(`${aio.version}|${aem.version}`).digest('hex');
}

export async function scrape() {
	const aio = await getJson(`${NPM}/@adobe/aio-cli/latest`);
	const aem = await getJson(`${NPM}/@adobe/aem-cli/latest`);
	return {
		latest: 'current',
		versions: {
			current: {
				line: 'current',
				node: '>=20', // union: aio-cli needs >=20, aem-cli >=18
				aioCli: aio.version,
				aemCli: aem.version,
				// Typed fields — consumed VERBATIM by the wizard (no kind-filtering in the view):
				storefront: STOREFRONT_BOILERPLATE,   // the EDS commerce boilerplate org/repo
				appStarters: APP_STARTERS,             // the @adobe/generator-app-* starters
				dropins: DROPINS,                      // the @dropins/storefront-* components
				// Back-compat flat list (deprecated — prefer the typed fields above):
				templates: [STOREFRONT_BOILERPLATE, ...APP_STARTERS, ...DROPINS],
				sourceRef: `npm:@adobe/aio-cli@${aio.version}+aem-cli@${aem.version}`,
				immutable: false,
			},
		},
	};
}
