/* ============================================================
   hybrid theme · 实时数据（GitHub star / fork / issue、论文引用数）
   这些数字一直在变，构建期写死就等于立刻过期，所以放在前端拉取：
     1. 扫页面里的 [data-metrics] 容器：repo 取 data-repo，citation 取 data-doi
     2. 先读 localStorage 缓存，命中且未过期就直接用，不发请求（省限流、不闪骨架）
     3. 过期才请求，成功后写回缓存并渲染
     4. 请求失败：有缓存就继续显示缓存值，没缓存整块移除，不留占位符
   数据源全是免 key 的公开 API：api.github.com / api.openalex.org / Semantic Scholar
   ============================================================ */

(function () {
	'use strict';

	const HY = window.__hybrid || {};
	const CFG = HY.metrics || {};

	// 模板只在启用时引入本文件；被人手动 script 引到别的页面时这里再兜一次
	if (CFG.enable === false) return;
	if (typeof window.fetch !== 'function') return;

	/* ---------------------------------------------------------
	   文案：由 layout.ejs 注入，缺失时按页面语言回退
	   --------------------------------------------------------- */
	const M = (HY.i18n && HY.i18n.metrics) || {};
	const isZh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
	// 词条都是「跟在数字后面」的后缀（"1.2k stars" / "12 citations"）
	const t = (key, zh, en) => M[key] || (isZh ? zh : en);

	/* ---------------------------------------------------------
	   缓存：键带站点版本号，跟着 main.js 的缓存策略走
	   --------------------------------------------------------- */
	const CACHE_PREFIX = 'hybrid:v' + String(HY.version || '1') + ':metrics:';
	const ttlHours = Number(CFG.cache_ttl);
	const TTL = (isFinite(ttlHours) ? ttlHours : 6) * 3600 * 1000;
	const TIMEOUT = 8000;

	function readCache(key) {
		try {
			const raw = localStorage.getItem(CACHE_PREFIX + key);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			return (parsed && typeof parsed.t === 'number' && parsed.d) ? parsed : null;
		} catch (e) { return null; }
	}

	function writeCache(key, data) {
		try {
			localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), d: data }));
		} catch (e) { /* 隐私模式下忽略 */ }
	}

	/* ---------------------------------------------------------
	   字段定义：渲染顺序由配置的 fields 决定
	   --------------------------------------------------------- */
	const GH = CFG.github || {};
	const CITE = CFG.citation || {};

	const GH_FIELDS = (Array.isArray(GH.fields) && GH.fields.length ? GH.fields : ['stars', 'forks'])
		.filter(f => typeof f === 'string');

	const ghUrl = (slug, tail) => 'https://github.com/' + slug + '/' + tail;

	const REPO_SPEC = {
		stars: { icon: 'star', href: s => ghUrl(s, 'stargazers'), label: () => t('stars', 'star', 'stars') },
		forks: { icon: 'code-fork', href: s => ghUrl(s, 'forks'), label: () => t('forks', 'fork', 'forks') },
		issues: { icon: 'exclamation-circle', href: s => ghUrl(s, 'issues'), label: () => t('issues', '未关闭 issue', 'open issues') },
		watchers: { icon: 'eye', href: s => ghUrl(s, 'watchers'), label: () => t('watchers', '关注者', 'watchers') },
		updated: { icon: 'clock-o', href: null, label: () => t('updated', '最近推送', 'last push') }
	};

	/* ---------------------------------------------------------
	   请求：带超时，非 2xx 直接抛
	   --------------------------------------------------------- */
	function getJSON(url, headers) {
		const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
		const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT) : null;
		return fetch(url, { headers: headers || {}, signal: ctrl ? ctrl.signal : undefined })
			.then(res => {
				if (!res.ok) throw new Error('HTTP ' + res.status);
				return res.json();
			})
			.finally(() => { if (timer) clearTimeout(timer); });
	}

	function loadRepo(slug) {
		return getJSON('https://api.github.com/repos/' + slug,
			{ Accept: 'application/vnd.github+json' })
			.then(d => ({
				stars: d.stargazers_count,
				forks: d.forks_count,
				issues: d.open_issues_count,
				watchers: d.subscribers_count,
				updated: (d.pushed_at || '').slice(0, 10)
			}));
	}

	// api.github.com 未认证限流 60 次/小时/IP，超了就退到 shields.io 的 JSON 端点补 star / fork
	function loadRepoFallback(slug) {
		const need = GH_FIELDS.filter(f => f === 'stars' || f === 'forks');
		if (!need.length) return Promise.reject(new Error('no fallback field'));

		const shield = (field) => getJSON('https://img.shields.io/github/' + field + '/' + slug + '.json')
			.then(d => {
				const raw = String(d && d.value).replace(/[^0-9.k]/gi, '');
				const n = parseFloat(raw);
				if (isNaN(n)) return undefined;
				return /k/i.test(raw) ? Math.round(n * 1000) : n;
			})
			.catch(() => undefined);

		return Promise.all(need.map(shield)).then(values => {
			const out = {};
			need.forEach((f, i) => { if (typeof values[i] === 'number') out[f] = values[i]; });
			return out;
		});
	}

	function openAlex(doi) {
		const mail = CITE.mailto ? '?mailto=' + encodeURIComponent(CITE.mailto) : '';
		return getJSON('https://api.openalex.org/works/doi:' + encodeURI(doi) + mail)
			.then(d => ({ count: d.cited_by_count, url: d.id || '' }));
	}

	function semanticScholar(doi) {
		const headers = CITE.api_key ? { 'x-api-key': CITE.api_key } : {};
		return getJSON('https://api.semanticscholar.org/graph/v1/paper/DOI:' + encodeURI(doi) +
			'?fields=citationCount', headers)
			.then(d => ({ count: d.citationCount, url: '' }));
	}

	function loadCitations(doi) {
		const first = CITE.provider === 'semanticscholar' ? semanticScholar : openAlex;
		const second = CITE.provider === 'semanticscholar' ? openAlex : semanticScholar;
		return first(doi).catch(() => second(doi));
	}

	function load(kind, key) {
		if (kind === 'repo') return loadRepo(key).catch(() => loadRepoFallback(key));
		return loadCitations(key);
	}

	/* ---------------------------------------------------------
	   渲染
	   --------------------------------------------------------- */
	function compact(n) {
		if (typeof n !== 'number' || isNaN(n)) return null;
		if (n < 1000) return String(n);
		if (n < 1e6) return (n / 1000).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, '') + 'k';
		return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'm';
	}

	function metricEl(item) {
		const el = document.createElement(item.href ? 'a' : 'span');
		el.className = 'metric';
		if (item.href) {
			el.href = item.href;
			el.target = '_blank';
			el.rel = 'noopener';
		}
		const icon = document.createElement('i');
		icon.className = 'fa fa-' + item.icon;
		icon.setAttribute('aria-hidden', 'true');
		const text = document.createElement('span');
		text.textContent = item.text;
		el.appendChild(icon);
		el.appendChild(text);
		el.setAttribute('title', item.title);
		el.setAttribute('aria-label', item.title);
		return el;
	}

	function repoItems(slug, data) {
		return GH_FIELDS.reduce((acc, field) => {
			const spec = REPO_SPEC[field];
			if (!spec) return acc;

			// updated 是日期字符串，其余是计数
			if (field === 'updated') {
				if (!data.updated) return acc;
				acc.push({
					icon: spec.icon, href: null,
					text: data.updated, title: spec.label() + ' ' + data.updated
				});
				return acc;
			}

			const n = data[field];
			if (typeof n !== 'number') return acc;
			acc.push({
				icon: spec.icon, href: spec.href(slug),
				text: compact(n), title: n + ' ' + spec.label()
			});
			return acc;
		}, []);
	}

	function citationItems(doi, data) {
		if (typeof data.count !== 'number') return [];
		const label = t('citations', '次引用', 'citations');
		return [{
			icon: 'quote-right',
			text: data.count + ' ' + label,
			title: data.count + ' ' + label,
			href: data.url || 'https://doi.org/' + encodeURI(doi)
		}];
	}

	function itemsFor(kind, key, data) {
		return kind === 'repo' ? repoItems(key, data) : citationItems(key, data);
	}

	function render(el, kind, key, data) {
		const items = itemsFor(kind, key, data);
		if (!items.length) { el.remove(); return; }
		el.textContent = '';
		items.forEach(item => el.appendChild(metricEl(item)));
		el.setAttribute('data-state', 'ready');
	}

	function skeleton(el, kind) {
		const count = kind === 'repo' ? GH_FIELDS.length : 1;
		el.textContent = '';
		for (let i = 0; i < count; i++) {
			const ph = document.createElement('span');
			ph.className = 'metric metric-skeleton';
			ph.setAttribute('aria-hidden', 'true');
			el.appendChild(ph);
		}
	}

	/* ---------------------------------------------------------
	   逐个元素挂载：先渲染缓存 / 骨架，再视情况后台刷新
	   --------------------------------------------------------- */
	function mount(el) {
		const kind = el.getAttribute('data-metrics');
		const key = el.getAttribute(kind === 'repo' ? 'data-repo' : 'data-doi');
		if (!kind || !key) { el.remove(); return; }

		const cacheKey = kind + ':' + key;
		const cached = readCache(cacheKey);
		if (cached) render(el, kind, key, cached.d);
		else skeleton(el, kind);

		if (cached && (Date.now() - cached.t) < TTL) return;

		load(kind, key).then(data => {
			if (!data) throw new Error('empty');
			writeCache(cacheKey, data);
			render(el, kind, key, data);
		}).catch(() => {
			// 失败且没有旧值可显示 -> 不留空洞
			if (!cached) el.remove();
		});
	}

	Array.prototype.forEach.call(document.querySelectorAll('[data-metrics]'), mount);
})();
