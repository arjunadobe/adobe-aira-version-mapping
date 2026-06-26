// Source module: Edge Delivery Services (Franklin / aem.live).
//
// Like App Builder, EDS has NO version matrix — it's a toolchain baseline
// (Node + git + aem-cli) plus the boilerplate starter repos. Source of truth:
//   - npm @adobe/aem-cli   -> latest version + engines.node (provides `aem up`)
//   - the public adobe/aem-boilerplate* GitHub repos (the starters)
//
// Project creation = clone a boilerplate, npm install, `aem up`. No PHP/Java,
// no IMS, no Marketplace keys.

import crypto from 'node:crypto';

export const SOURCE_REPO = 'npm:@adobe/aem-cli';
const NPM = 'https://registry.npmjs.org';

// The canonical EDS starter boilerplates (public adobe/* repos).
const BOILERPLATES = ['aem-boilerplate', 'aem-boilerplate-commerce', 'aem-boilerplate-xwalk'];

async function getJson(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'aira-registry' } });
	if (!res.ok) throw new Error(`${url} -> ${res.status}`);
	return res.json();
}

/** Change-detection: the aem-cli version + node engine. */
export async function headSha() {
	const cli = await getJson(`${NPM}/@adobe/aem-cli/latest`);
	return crypto.createHash('sha256').update(`${cli.version}|${cli.engines?.node}|${BOILERPLATES.join(',')}`).digest('hex');
}

export async function scrape() {
	const cli = await getJson(`${NPM}/@adobe/aem-cli/latest`);
	return {
		latest: 'current',
		versions: {
			current: {
				line: 'current',
				node: cli.engines?.node || '>=18',
				aemCli: cli.version,
				templates: BOILERPLATES,
				sourceRef: `npm:@adobe/aem-cli@${cli.version}`,
				immutable: false,
			},
		},
	};
}
