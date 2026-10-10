/* ============================================================
   hybrid theme
   页面分三种模式：home（个人主页）/ page（常规页）/ wiki（笔记区）
   首两类没有侧边栏和目录树，因此所有模块都要做空值防御。
   ============================================================ */

(function () {
	'use strict';

	const $ = (sel, root) => (root || document).querySelector(sel);
	const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

	/* ---------------------------------------------------------
	   深浅色：auto 跟随系统，手动切换写入 localStorage
	   --------------------------------------------------------- */
	function initColorScheme() {
		const root = document.documentElement;
		const toggle = $('.scheme-toggle');
		const KEY = 'hybrid-scheme';

		const saved = localStorage.getItem(KEY);
		if (saved === 'light' || saved === 'dark') {
			root.setAttribute('data-scheme', saved);
		}

		const syncIcon = () => {
			if (!toggle) return;
			const isDark = root.getAttribute('data-scheme') === 'dark' ||
				(root.getAttribute('data-scheme') === 'auto' &&
					window.matchMedia('(prefers-color-scheme: dark)').matches);
			const icon = toggle.querySelector('i');
			if (icon) {
				icon.classList.toggle('fa-moon-o', !isDark);
				icon.classList.toggle('fa-sun-o', isDark);
			}
		};

		syncIcon();
		window.matchMedia('(prefers-color-scheme: dark)')
			.addEventListener('change', syncIcon);

		if (toggle) {
			toggle.addEventListener('click', () => {
				const isDark = root.getAttribute('data-scheme') === 'dark' ||
					(root.getAttribute('data-scheme') === 'auto' &&
						window.matchMedia('(prefers-color-scheme: dark)').matches);
				const next = isDark ? 'light' : 'dark';
				root.setAttribute('data-scheme', next);
				localStorage.setItem(KEY, next);
				syncIcon();
				window.dispatchEvent(new CustomEvent('hybrid:schemechange'));
			});
		}
	}

	/* ---------------------------------------------------------
	   顶栏：向下滚动隐藏 / 移动菜单 / 回到顶部
	   --------------------------------------------------------- */
	function initChrome() {
		const header = $('#header');
		const navToggle = $('.nav-toggle');
		const menu = $('#menu');

		if (navToggle && menu) {
			navToggle.addEventListener('click', () => menu.classList.toggle('open'));
			document.addEventListener('click', (e) => {
				if (!e.target.closest('#menu') && !e.target.closest('.nav-toggle')) {
					menu.classList.remove('open');
				}
			});
		}

		if (header) {
			let last = 0;
			window.addEventListener('scroll', () => {
				const y = window.scrollY;
				header.classList.toggle('is-hidden', y > last && y > 120);
				last = y;
			}, { passive: true });
		}

		const backtotop = $('#backtotop');
		if (backtotop) {
			window.addEventListener('scroll', () => {
				backtotop.classList.toggle('show', window.scrollY > 400);
			}, { passive: true });
			backtotop.addEventListener('click', () => {
				window.scrollTo({ top: 0, behavior: 'smooth' });
			});
		}
	}

	/* ---------------------------------------------------------
	   侧边栏：折叠 / 展开
	   窄屏（<=1100px）侧栏浮在内容之上并默认收起，宽屏常驻并默认展开；
	   跨越断点或改变窗口宽度时自动跟随，手动开合只在宽屏记入偏好。
	   --------------------------------------------------------- */
	function initSidebar() {
		const sidebar = $('#sidebar');
		const toggle = $('#sidebar-toggle');
		if (!sidebar || !toggle) return;

		const mq = window.matchMedia('(max-width: 1100px)');
		const KEY = 'hybrid-sidebar';

		const setCollapsed = (collapsed) => {
			sidebar.classList.toggle('is-collapsed', collapsed);
			document.body.classList.toggle('sidebar-collapsed', collapsed);

			const icon = toggle.querySelector('i');
			if (icon) {
				icon.classList.toggle('fa-arrow-right', collapsed);
				icon.classList.toggle('fa-arrow-left', !collapsed);
			}
			const label = collapsed ? '展开目录' : '收起目录';
			toggle.setAttribute('aria-label', label);
			toggle.setAttribute('title', label);
		};

		// null = 跟随窗口宽度；true/false = 用户手动指定
		let userPref = null;
		const saved = localStorage.getItem(KEY);
		if (!mq.matches && (saved === '1' || saved === '0')) userPref = saved === '1';

		const apply = () => setCollapsed(userPref === null ? mq.matches : userPref);

		apply();

		toggle.addEventListener('click', () => {
			userPref = !sidebar.classList.contains('is-collapsed');
			if (!mq.matches) localStorage.setItem(KEY, userPref ? '1' : '0');
			setCollapsed(userPref);
		});

		// 跨过断点就回到「自动」：窄屏收起、宽屏展开
		const onBreakpoint = () => { userPref = null; apply(); };
		if (mq.addEventListener) mq.addEventListener('change', onBreakpoint);
		else if (mq.addListener) mq.addListener(onBreakpoint);

		// 窄屏点击侧边栏外部关闭
		document.addEventListener('click', (e) => {
			if (!mq.matches) return;
			if (!e.target.closest('#sidebar') && !e.target.closest('#sidebar-toggle') &&
				!sidebar.classList.contains('is-collapsed')) {
				userPref = false;
				setCollapsed(true);
			}
		});
	}

	/* ---------------------------------------------------------
	   目录树：展开 / 折叠 + 展开状态记忆
	   --------------------------------------------------------- */
	const TREE_KEY = 'hybrid-tree-open';

	// 目录树的结构是 <li><a>…</a><ul>…</ul><ul>…</ul></li>，
	// 子列表是 li 的直接子级，而不是 a.closest('ul') 的兄弟
	function childUls(node) {
		const li = node && node.closest('li');
		if (!li) return [];
		return $$(':scope > ul', li);
	}

	function isExpanded(node) {
		const uls = childUls(node);
		return uls.length > 0 && uls.some(ul => ul.style.display === 'block');
	}

	// 图标跟随子列表的真实显示状态，避免「减号图标 + 收起的内容」
	function syncIcon(node) {
		if (!node) return;
		const icon = node.querySelector('.fa');
		if (!icon) return;
		const open = isExpanded(node);
		icon.classList.toggle('fa-minus-square-o', open);
		icon.classList.toggle('fa-plus-square-o', !open);
	}

	// 目录行的链接（排除右侧的索引入口图标）
	function dirLinks() {
		return $$('#tree li.directory > a').filter(a => !a.classList.contains('dir-index'));
	}

	function syncTreeIcons() {
		dirLinks().forEach(syncIcon);
	}

	function setExpanded(node, expanded) {
		const uls = childUls(node);
		if (!uls.length) return false;
		uls.forEach(ul => { ul.style.display = expanded ? 'block' : 'none'; });
		syncIcon(node);
		return true;
	}

	// 自下而上展开祖先链，把目标节点「露出来」
	function showPath(node) {
		if (!node || node.id === 'tree') return;
		if (node.tagName.toLowerCase() === 'ul') node.style.display = 'block';
		showPath(node.parentElement);
	}

	// 用「根 -> 当前节点」的标题路径做 key，保证跨页面、刷新后依然稳定
	function nodeKey(node) {
		const parts = [];
		let li = node && node.closest('li');
		while (li && li.id !== 'tree') {
			const a = li.querySelector(':scope > a');
			if (a) parts.unshift((a.textContent || '').trim());
			const ul = li.parentElement;
			li = ul && ul.closest ? ul.closest('li') : null;
		}
		return parts.join('/');
	}

	function readTreeState() {
		try {
			const raw = JSON.parse(localStorage.getItem(TREE_KEY) || '[]');
			return Array.isArray(raw) ? raw : [];
		} catch (e) {
			return [];
		}
	}

	// 只在用户手动开合时写入，避免搜索过滤把状态冲掉
	function saveTreeState() {
		const open = dirLinks().filter(isExpanded).map(nodeKey);
		try {
			localStorage.setItem(TREE_KEY, JSON.stringify(open));
		} catch (e) { /* 隐私模式下忽略 */ }
	}

	// 换页后侧栏会回到顶部，把当前节点滚进可视区，省得手动找
	function revealActive() {
		const sidebar = $('#sidebar');
		const active = $('#tree .active');
		if (!sidebar || !active) return;
		const box = sidebar.getBoundingClientRect();
		if (!box.height) return;
		const rect = active.getBoundingClientRect();
		if (rect.top >= box.top && rect.bottom <= box.bottom) return;
		sidebar.scrollTop += rect.top - box.top - box.height / 2 + rect.height / 2;
	}

	// 恢复上次展开的节点（连同祖先链），再展开到当前页面所在节点
	function restoreTreeView() {
		const saved = new Set(readTreeState());
		dirLinks().forEach(a => {
			if (!saved.has(nodeKey(a))) return;
			showPath(a);
			setExpanded(a, true);
		});
		const active = $('#tree .active');
		if (active) showPath(active);
		syncTreeIcons();
		revealActive();
	}

	function initTree() {
		const tree = $('#tree');
		if (!tree) return;

		restoreTreeView();

		// 目录行整行点击 = 展开/折叠，不再触发跳转，避免整页刷新后树又收回去。
		// 需要打开该目录的索引笔记时，点右侧的 .dir-index 图标（原生跳转）。
		// 文件节点不做拦截。
		document.addEventListener('click', (e) => {
			const target = e.target;
			if (!target || !target.closest) return;

			const link = target.closest('#tree li > a');
			if (!link) return;

			// 索引入口保持原生跳转
			if (link.classList.contains('dir-index')) return;

			const li = link.closest('li');
			if (!li || !li.classList.contains('directory')) return;

			// 没有任何子列表可展开时退回原生跳转，避免「点了没反应」
			if (!childUls(link).length) return;

			e.preventDefault();
			setExpanded(link, !isExpanded(link));
			saveTreeState();
		});
	}

	/* ---------------------------------------------------------
	   目录树过滤
	   --------------------------------------------------------- */
	function initTreeSearch() {
		const input = $('#search-input');
		const tree = $('#tree');
		if (!input || !tree) return;

		const engine = input.getAttribute('data-engine') || 'https://www.google.com/search?q=';

		input.addEventListener('input', () => {
			const kw = input.value.trim();

			if (!kw) {
				// 清空关键词后回到「记忆中的树」，而不是只剩当前页面一条路径
				$$('#tree ul', tree).forEach(ul => { ul.style.display = ''; });
				$$('#tree li.file > a, #tree li.directory > a').forEach(a => {
					a.style.display = '';
				});
				restoreTreeView();
				return;
			}

			// 先全部收起并隐藏，再展开命中项
			$$('#tree ul', tree).forEach(ul => { ul.style.display = 'none'; });
			$$('#tree li.file > a, #tree li.directory > a').forEach(a => { a.style.display = 'none'; });

			const hits = $$('#tree li a').filter(a => a.textContent.includes(kw));
			hits.forEach(a => {
				a.style.display = 'block';
				showPath(a.parentElement);
			});
			syncTreeIcons();
		});

		input.addEventListener('keyup', (e) => {
			if (e.key !== 'Enter') return;
			const kw = input.value.trim();
			if (kw) window.open(engine + encodeURIComponent(kw) + '%20site:' + location.hostname, '_blank');
		});
	}

	/* ---------------------------------------------------------
	   文章内目录（TOC）
	   --------------------------------------------------------- */
	function slugify(text) {
		return text.trim().toLowerCase()
			.replace(/[\s]+/g, '-')
			.replace(/[^\w\u4e00-\u9fa5-]/g, '');
	}

	function initArticleToc() {
		// 目录容器挂在目录树里激活节点的后面，不能取全文档第一个 .article-toc
		const box = $('#tree .active + .article-toc');
		const content = $('#article-content');
		if (!box || !content) return;

		const headings = $$('h1, h2, h3, h4, h5, h6', content);
		if (!headings.length) return;

		// 标题可能没有 id，这里补上，避免依赖渲染器生成锚点
		headings.forEach(h => {
			if (!h.id) h.id = slugify(h.textContent);
		});

		const ul = document.createElement('ul');
		box.innerHTML = '';
		box.appendChild(ul);
		box.style.display = 'block';

		headings.forEach(h => {
			const li = document.createElement('li');
			const a = document.createElement('a');
			a.href = '#' + h.id;
			a.textContent = h.textContent.replace(/#$/, '').trim();
			a.style.paddingLeft = (8 + (parseInt(h.tagName.slice(1), 10) - 1) * 10) + 'px';
			li.appendChild(a);
			ul.appendChild(li);
		});

		const links = $$('a', ul);
		links.forEach(a => {
			a.addEventListener('click', (e) => {
				e.preventDefault();
				const target = document.getElementById(decodeURIComponent(a.getAttribute('href')).slice(1));
				if (!target) return;
				window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
				history.replaceState(null, '', a.getAttribute('href'));
			});
		});

		// 滚动高亮
		const sync = () => {
			let current = null;
			headings.forEach(h => {
				if (h.getBoundingClientRect().top + window.scrollY <= window.scrollY + 100) current = h;
			});
			links.forEach(a => {
				a.classList.toggle('read', !!current && decodeURIComponent(a.getAttribute('href')) === '#' + current.id);
			});
		};
		window.addEventListener('scroll', sync, { passive: true });
		sync();
	}

	/* ---------------------------------------------------------
	   图片灯箱
	   --------------------------------------------------------- */
	function initLightbox() {
		const images = $$('#article-content img');
		if (!images.length) return;

		const lightbox = document.createElement('div');
		Object.assign(lightbox.style, {
			position: 'fixed', inset: '0', zIndex: '1000',
			display: 'none', alignItems: 'center', justifyContent: 'center',
			background: 'rgba(0,0,0,.82)', cursor: 'zoom-out'
		});

		const img = document.createElement('img');
		Object.assign(img.style, { maxWidth: '86%', maxHeight: '86%', borderRadius: '8px' });
		lightbox.appendChild(img);
		document.body.appendChild(lightbox);

		const close = () => {
			lightbox.style.display = 'none';
			document.body.style.overflow = '';
		};

		lightbox.addEventListener('click', close);
		document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

		images.forEach(image => {
			image.style.cursor = 'zoom-in';
			image.addEventListener('click', () => {
				img.src = image.getAttribute('src');
				lightbox.style.display = 'flex';
				document.body.style.overflow = 'hidden';
			});
		});
	}

	/* ---------------------------------------------------------
	   Mermaid 图表
	   渲染器会输出 <pre><code class="language-mermaid">，
	   这里换成 <div class="mermaid"> 再交给 mermaid.js 渲染。
	   --------------------------------------------------------- */
	function initMermaid() {
		const cfg = (window.__hybrid && window.__hybrid.mermaid) || {};
		if (!cfg.enable) return;

		const codes = $$('code.language-mermaid, code.lang-mermaid');
		if (!codes.length) return;

		codes.forEach(code => {
			const pre = code.closest('pre') || code;
			const box = document.createElement('div');
			box.className = 'mermaid';
			box.setAttribute('data-loaded', 'false');
			// prism 会把代码按行拆成 <span class="line"> 并用 <br> 分隔，
			// 直接取 textContent 会把所有行连成一行，mermaid 会解析失败
			const lineEls = $$('.line', code);
			const src = lineEls.length
				? lineEls.map(el => el.textContent).join('\n')
				: code.textContent;
			// 原始源码留一份，深浅色切换后需要重新渲染
			box.setAttribute('data-src', src);
			box.textContent = src;
			pre.parentNode.replaceChild(box, pre);
		});

		const isDark = () => {
			const root = document.documentElement;
			return root.getAttribute('data-scheme') === 'dark' ||
				(root.getAttribute('data-scheme') === 'auto' &&
					window.matchMedia('(prefers-color-scheme: dark)').matches);
		};

		const render = async () => {
			const url = 'https://cdn.jsdelivr.net/npm/mermaid@' + cfg.version + '/dist/mermaid.esm.min.mjs';
			const mermaid = (await import(url)).default;
			mermaid.initialize({
				startOnLoad: false,
				theme: isDark() ? (cfg.theme_dark || 'dark') : (cfg.theme || 'default'),
				securityLevel: 'strict'
			});
			await mermaid.run({ querySelector: '.mermaid' });
			$$('.mermaid').forEach(el => el.setAttribute('data-loaded', 'true'));
		};

		render().catch(err => console.error('[hybrid] mermaid 渲染失败:', err));

		// 深浅色切换后需要按新主题重画
		window.addEventListener('hybrid:schemechange', () => {
			$$('.mermaid').forEach(el => {
				el.removeAttribute('data-processed');
				el.innerHTML = el.getAttribute('data-src') || '';
			});
			render().catch(() => { });
		});
	}

	/* ---------------------------------------------------------
	   代码块复制
	   --------------------------------------------------------- */
	function initCodeCopy() {
		// 复制按钮文案跟随站点语言，避免主题里硬编码中文
		const isZh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
		const TXT = { copy: isZh ? '复制' : 'Copy', copied: isZh ? '已复制' : 'Copied' };

		$$('#article-content pre').forEach(pre => {
			const btn = document.createElement('button');
			btn.className = 'code-copy';
			btn.type = 'button';
			btn.textContent = TXT.copy;
			pre.style.position = 'relative';
			pre.appendChild(btn);

			btn.addEventListener('click', () => {
				const code = pre.querySelector('code') || pre;
				const text = code.innerText;
				const done = () => {
					btn.textContent = TXT.copied;
					setTimeout(() => { btn.textContent = TXT.copy; }, 1600);
				};
				if (navigator.clipboard) {
					navigator.clipboard.writeText(text).then(done);
				} else {
					const ta = document.createElement('textarea');
					ta.value = text;
					document.body.appendChild(ta);
					ta.select();
					document.execCommand('copy');
					ta.remove();
					done();
				}
			});
		});
	}

	/* --------------------------------------------------------- */
	initColorScheme();
	initChrome();
	initSidebar();
	initTree();
	initTreeSearch();
	initArticleToc();
	initLightbox();
	initMermaid();
	initCodeCopy();
})();
