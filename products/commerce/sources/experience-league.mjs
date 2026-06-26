// Source module: Adobe Experience League "System Requirements" page.
//
//   https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/system-requirements
//
// RICHEST requirement source for Commerce: per-PATCH rows (2.4.8-p5, 2.4.7-p10 …)
// with PHP, Composer, OpenSearch, MariaDB/MySQL, RabbitMQ, Valkey/Redis, nginx.
// Complements the GitHub sources (which give the exact ext-* list); EL gives the
// version + service matrix.
//
// CAVEAT: this scrapes a rendered docs page (markdown tables). It is more FRAGILE
// than the GitHub YAML — layout changes or footnote superscripts (e.g. "12.31"
// meaning "12.3" + footnote 1) can skew a cell. The validate gate + a GitHub
// cross-check are the safety net. Prefer GitHub YAML where it suffices; use EL for
// the per-patch service matrix.

import crypto from 'node:crypto';

export const SOURCE_REPO = 'experienceleague/system-requirements';
const URL = 'https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/system-requirements';

async function getText(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'aira-registry' } });
	if (!res.ok) throw new Error(`${url} -> ${res.status}`);
	return res.text();
}

/** Change-detection: hash the page (EL has no commit SHA). */
export async function headSha() {
	const md = await getText(URL);
	return crypto.createHash('sha256').update(extractTables(md)).digest('hex');
}

export async function scrape() {
	const md = await getText(URL);
	return parseSystemRequirements(md);
}

// ---- pure parser (testable offline) ---------------------------------------

/** Keep only the dependency-table region so the page chrome doesn't perturb the hash. */
export function extractTables(md) {
	return md.split('\n').filter(l => l.trim().startsWith('|')).join('\n');
}

function splitRow(line) {
	return line.split('|').slice(1, -1).map(s => s.trim());
}
function splitList(v) {
	return (v || '').split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Parse the EL markdown into { latest, versions }. Each table block:
 *   | table …layout-auto | | |          (header — class junk)
 *   | --- | --- | --- |                  (separator)
 *   | Software dependencies | 2.4.8-p5 (latest) | 2.4.8-p4 |   ← version labels = columns
 *   | Composer | … | … |  | PHP | 8.4, 8.3 | … |  | OpenSearch | … |  …
 */
export function parseSystemRequirements(md) {
	const lines = md.split('\n');
	const versions = {};
	let latest = null;
	let i = 0;

	while (i < lines.length) {
		if (!/^\|\s*table .*layout-auto/i.test(lines[i])) { i++; continue; }
		i++;                                   // skip the class-junk header
		if (/^\|\s*-/.test(lines[i] || '')) i++; // skip the --- separator
		const rows = [];
		while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(splitRow(lines[i])); i++; }

		const map = {};
		for (const cells of rows) map[cells[0]] = cells.slice(1);
		const verCells = map['Software dependencies'];
		if (!verCells) continue;

		verCells.forEach((raw, col) => {
			if (!raw) return;
			const isLatest = /\(latest\)/i.test(raw);
			const version = raw.replace(/\(latest\)/i, '').trim();
			if (!version) return;
			const line = (/^(\d+\.\d+\.\d+)/.exec(version) || [])[1] || version;
			const php = splitList(map['PHP']?.[col]);
			versions[version] = {
				line,
				patches: [version],
				php: php[0],
				phpAlternatives: php.slice(1),
				composer: (map['Composer']?.[col] || '').trim(),
				extensions: [],                // EL omits ext-*; comes from the GitHub composer.json
				services: prune({
					opensearch: map['OpenSearch']?.[col],
					elasticsearch: map['Elasticsearch']?.[col],
					mariadb: map['MariaDB']?.[col],
					mysql: map['MySQL']?.[col],
					rabbitmq: map['RabbitMQ']?.[col],
					valkey: map['Valkey']?.[col],
					redis: map['Redis']?.[col],
					nginx: map['nginx']?.[col],
				}),
				sourceRef: `experienceleague@${version}`,
				immutable: true,
			};
			if (isLatest && !latest) latest = version;
		});
	}
	if (!latest) latest = Object.keys(versions).sort().at(-1);
	return { latest, versions };
}

function prune(obj) {
	const out = {};
	for (const [k, v] of Object.entries(obj)) { const t = (v || '').trim(); if (t) out[k] = t; }
	return out;
}
