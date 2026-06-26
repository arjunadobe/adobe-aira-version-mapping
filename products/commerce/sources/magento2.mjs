// Source module: magento/magento2  ->  Open Source data.
//
// Reads, with NO auth and NO composer:
//   - tags             -> the version list
//   - composer.json @ tag -> .require.php + ext-* (per-tag immutable)
// OSS has no .magento/services.yaml, so services = {} (the IDE links to docs).

const REPO = 'magento/magento2';
const API = `https://api.github.com/repos/${REPO}`;
const RAW = `https://raw.githubusercontent.com/${REPO}`;
const RELEASE_TAG = /^\d+\.\d+\.\d+$/;

async function getJson(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'aira-registry' } });
	if (!res.ok) throw new Error(`${url} -> ${res.status}`);
	return res.json();
}
async function getText(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'aira-registry' } });
	return res.ok ? res.text() : null;
}

export async function headSha() {
	const tags = await getJson(`${API}/tags?per_page=1`);
	return tags[0]?.commit?.sha ?? 'unknown';
}

function phpFromConstraint(constraint) {
	// "~8.3.0 || ~8.4.0" -> default "8.4", alternatives ["8.3"]
	const mins = [...(constraint || '').matchAll(/(\d+)\.(\d+)/g)].map(m => `${m[1]}.${m[2]}`);
	const uniq = [...new Set(mins)].sort();
	return { php: uniq.at(-1), phpAlternatives: uniq.slice(0, -1) };
}

export async function scrape() {
	const tags = (await getJson(`${API}/tags?per_page=100`)).map(t => t.name).filter(n => RELEASE_TAG.test(n));
	const versions = {};
	for (const tag of tags) {
		const cj = await getText(`${RAW}/${tag}/composer.json`);
		if (!cj) continue;
		let parsed;
		try { parsed = JSON.parse(cj); } catch { continue; }
		const req = parsed.require ?? {};
		const { php, phpAlternatives } = phpFromConstraint(req.php);
		versions[tag] = {
			line: tag,
			patches: [tag],
			php,
			phpAlternatives,
			composer: 'see composer.json',
			extensions: Object.keys(req).filter(k => k.startsWith('ext-')).map(k => k.slice(4)),
			services: {},
			sourceRef: `magento2@${tag}`,
			immutable: true,
		};
	}
	const latest = Object.keys(versions).sort().at(-1);
	return { latest, versions };
}
