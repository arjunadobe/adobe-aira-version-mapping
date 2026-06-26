// Source module: magento/magento-cloud  ->  Adobe Commerce (Cloud + on-prem) data.
//
// Reads, with NO auth and NO composer:
//   - branches            -> the version list (incl. patch ranges like 2.4.5-p1-p7)
//   - .magento.app.yaml    -> type: php:X, dependencies.php.composer/composer, runtime.extensions
//   - .magento/services.yaml -> mysql / opensearch / cache (valkey|redis) versions
//
// Each branch is effectively immutable for our purposes, so per-version rows are
// cached forever; only the branch LIST needs a refresh.

const REPO = 'magento/magento-cloud';
const API = `https://api.github.com/repos/${REPO}`;
const RAW = `https://raw.githubusercontent.com/${REPO}`;

const VERSION_BRANCH = /^\d+\.\d+\.\d+/; // 2.4.8, 2.4.5-p1-p7, 2.4.8-php8.3, ...

async function getJson(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'aira-registry' } });
	if (!res.ok) throw new Error(`${url} -> ${res.status}`);
	return res.json();
}
async function getText(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'aira-registry' } });
	return res.ok ? res.text() : null;
}

/** Cheap change-detection: the HEAD commit SHA of the default branch. */
export async function headSha() {
	const b = await getJson(`${API}/branches/master`);
	return b.commit.sha;
}

/** Minimal YAML field readers (avoids a yaml dep for these flat fields). */
function yamlScalar(text, key) {
	const m = new RegExp(`^\\s*${key}\\s*:\\s*["']?([^"'\\n]+)`, 'm').exec(text || '');
	return m ? m[1].trim() : undefined;
}
function appPhp(appYaml) {
	const t = yamlScalar(appYaml, 'type'); // "php:8.4"
	return t && t.startsWith('php:') ? t.slice(4) : undefined;
}
function serviceVersions(servicesYaml) {
	const out = {};
	for (const [name, key] of [['mysql', 'mysql'], ['opensearch', 'opensearch'], ['cache', 'cache']]) {
		const block = new RegExp(`${key}:\\s*[\\s\\S]*?type:\\s*([\\w.:]+)`, 'm').exec(servicesYaml || '');
		if (block) out[name] = block[1];
	}
	return out;
}

export async function scrape() {
	const branches = (await getJson(`${API}/branches?per_page=100`)).map(b => b.name).filter(n => VERSION_BRANCH.test(n));

	// Group patch branches under their line (2.4.8, 2.4.8-php8.3 -> line 2.4.8).
	const lines = new Map();
	for (const b of branches) {
		const line = /^(\d+\.\d+\.\d+)/.exec(b)[1];
		if (!lines.has(line)) lines.set(line, []);
		lines.get(line).push(b);
	}

	const versions = {};
	for (const [line, patches] of lines) {
		const app = await getText(`${RAW}/${line}/.magento.app.yaml`);
		const svc = await getText(`${RAW}/${line}/.magento/services.yaml`);
		if (!app) continue;
		const phpAlt = patches.filter(p => /-php\d/.test(p)).map(p => /-php([\d.]+)/.exec(p)[1]);
		versions[line] = {
			line,
			patches,
			php: appPhp(app),
			phpAlternatives: phpAlt,
			composer: yamlScalar(app, 'composer/composer') ?? undefined,
			extensions: (app.match(/^\s*-\s*(\w+)\s*$/gm) || []).map(s => s.replace(/^\s*-\s*/, '').trim()).filter(Boolean),
			services: serviceVersions(svc),
			sourceRef: `magento-cloud@${line}`,
			immutable: true,
		};
	}
	const latest = [...lines.keys()].sort(cmpVer).at(-1);
	return { latest, versions };
}

function cmpVer(a, b) {
	const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
	for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
	return 0;
}
