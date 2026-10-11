/* ============================================================
   hybrid theme
   页面分三种模式：home（个人主页）/ page（常规页）/ wiki（笔记区）
   首两类没有侧边栏和目录树，因此所有模块都要做空值防御。
   ============================================================ */

(function () {
	'use strict';

	const $ = (sel, root) => (root || document).querySelector(sel);
	const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

	// 文案由模板注入（见 layout.ejs 的 window.__hybrid.i18n），
	// 取不到时按页面语言回退，保证主题在没有对应语言文件时也不会露出空白按钮
	const I18N = (window.__hybrid && window.__hybrid.i18n) || {};
	const isZh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
	const t = (key, fallbackZh, fallbackEn) =>
		I18N[key] || (isZh ? fallbackZh : fallbackEn);

	/* ---------------------------------------------------------
	   本地缓存（localStorage）
	   所有键都带站点版本号：hybrid:v<version>:<key>
	   发新版时把主题 _config.yml 的 version +1，旧版本的键会在
	   启动时被清掉，避免新代码读到上一版留下的状态（结构变了会出错）
	   --------------------------------------------------------- */
	const CACHE_VERSION = String((window.__hybrid && window.__hybrid.version) || '1');
	const CACHE_PREFIX = 'hybrid:v' + CACHE_VERSION + ':';

	// 无版本号的旧键：含义稳定、跨版本可直接搬过来的列在这里，其余一律丢弃
	const LEGACY_MIGRATE = {
		'hybrid-scheme': 'scheme',
		'hybrid-sidebar': 'sidebar'
	};

	function cacheGet(key) {
		try { return localStorage.getItem(CACHE_PREFIX + key); } catch (e) { return null; }
	}

	function cacheSet(key, value) {
		try { localStorage.setItem(CACHE_PREFIX + key, value); } catch (e) { /* 隐私模式下忽略 */ }
	}

	// 启动时做一次版本对齐：迁移可复用的旧键，清掉其它版本的残留
	function initCache() {
		try {
			Object.keys(LEGACY_MIGRATE).forEach(oldKey => {
				const value = localStorage.getItem(oldKey);
				if (value === null) return;
				if (cacheGet(LEGACY_MIGRATE[oldKey]) === null) cacheSet(LEGACY_MIGRATE[oldKey], value);
				localStorage.removeItem(oldKey);
			});

			// 目录树展开状态跟目录结构强绑定，改版后 key 可能对不上，不迁移
			localStorage.removeItem('hybrid-tree-open');

			const stale = [];
			for (let i = 0; i < localStorage.length; i++) {
				const k = localStorage.key(i);
				if (k && k.indexOf('hybrid:v') === 0 && k.indexOf(CACHE_PREFIX) !== 0) stale.push(k);
			}
			stale.forEach(k => localStorage.removeItem(k));
		} catch (e) { /* 隐私模式下忽略 */ }
	}

/* ---------------------------------------------------------
   深浅色：auto 跟随系统，手动切换写入 localStorage
   --------------------------------------------------------- */
	function initColorScheme() {
		const root = document.documentElement;
		const toggle = $('.scheme-toggle');

		const saved = cacheGet('scheme');
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
				cacheSet('scheme', next);
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

		// data-autohide 由 header.ejs 按 theme.appearance.hide_header_on_scroll 写入
		if (header && header.dataset.autohide !== 'false') {
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

		const setCollapsed = (collapsed) => {
			sidebar.classList.toggle('is-collapsed', collapsed);
			document.body.classList.toggle('sidebar-collapsed', collapsed);

			const icon = toggle.querySelector('i');
			if (icon) {
				icon.classList.toggle('fa-arrow-right', collapsed);
				icon.classList.toggle('fa-arrow-left', !collapsed);
			}
			// 按钮说的是「点了会发生什么」，所以展开态显示「收起」
			const label = collapsed ? t('expand', '展开目录', 'Expand TOC') : t('collapse', '收起目录', 'Collapse TOC');
			toggle.setAttribute('aria-label', label);
			toggle.setAttribute('title', label);
		};

		// null = 跟随窗口宽度；true/false = 用户手动指定
		let userPref = null;
		const saved = cacheGet('sidebar');
		if (!mq.matches && (saved === '1' || saved === '0')) userPref = saved === '1';

		const apply = () => setCollapsed(userPref === null ? mq.matches : userPref);

		apply();

		toggle.addEventListener('click', () => {
			userPref = !sidebar.classList.contains('is-collapsed');
			if (!mq.matches) cacheSet('sidebar', userPref ? '1' : '0');
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
	const TREE_KEY = 'tree-open';

	function directoryButtons() {
		return $$('#tree li.directory > .tree-row > .tree-toggle');
	}

	function childList(button) {
		const li = button && button.closest('li.directory');
		return li ? $(':scope > .tree-children', li) : null;
	}

	function isExpanded(button) {
		return !!button && button.getAttribute('aria-expanded') === 'true';
	}

	function syncIcon(button) {
		if (!button) return;
		const icon = button.querySelector('.fa');
		if (!icon) return;
		const open = isExpanded(button);
		icon.classList.toggle('fa-angle-down', open);
		icon.classList.toggle('fa-angle-right', !open);
	}

	function syncTreeIcons() {
		directoryButtons().forEach(syncIcon);
	}

	function setExpanded(button, expanded) {
		const list = childList(button);
		if (!list) return false;
		button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
		list.hidden = !expanded;
		button.closest('li.directory').classList.toggle('is-open', expanded);
		syncIcon(button);
		return true;
	}

	function showAncestors(item) {
		let parent = item && item.parentElement ? item.parentElement.closest('li.directory') : null;
		while (parent) {
			parent.hidden = false;
			setExpanded($(':scope > .tree-row > .tree-toggle', parent), true);
			parent = parent.parentElement ? parent.parentElement.closest('li.directory') : null;
		}
	}

	function nodeKey(button) {
		const li = button && button.closest('li.tree-node');
		return li ? (li.dataset.treeKey || '') : '';
	}

	function readTreeState() {
		try {
			const raw = JSON.parse(cacheGet(TREE_KEY) || '[]');
			// 版本/结构变了可能是别的形状，过滤掉非字符串，避免后面 Set 比对出错
			return Array.isArray(raw) ? raw.filter(k => typeof k === 'string') : [];
		} catch (e) {
			return [];
		}
	}

	// 只在用户手动开合时写入，避免搜索过滤把状态冲掉
	function saveTreeState() {
		const open = directoryButtons().filter(isExpanded).map(nodeKey).filter(Boolean);
		cacheSet(TREE_KEY, JSON.stringify(open));
	}

	// 换页后侧栏会回到顶部，把当前节点滚进可视区，省得手动找
	function revealActive() {
		const sidebar = $('#sidebar');
		const active = $('#tree li.tree-node.active');
		if (!sidebar || !active) return;
		const box = sidebar.getBoundingClientRect();
		if (!box.height) return;
		const row = $(':scope > .tree-row', active) || active;
		const rect = row.getBoundingClientRect();
		if (rect.top >= box.top && rect.bottom <= box.bottom) return;
		sidebar.scrollTop += rect.top - box.top - box.height / 2 + rect.height / 2;
	}

	// 恢复上次展开的节点（连同祖先链），再展开到当前页面所在节点
	function restoreTreeView() {
		const saved = new Set(readTreeState());
		directoryButtons().forEach(button => setExpanded(button, false));
		directoryButtons().forEach(button => {
			if (!saved.has(nodeKey(button))) return;
			showAncestors(button.closest('li.tree-node'));
			setExpanded(button, true);
		});
		const active = $('#tree li.tree-node.active');
		if (active) {
			showAncestors(active);
			if (active.classList.contains('directory')) {
				setExpanded($(':scope > .tree-row > .tree-toggle', active), true);
			}
		}
		syncTreeIcons();
		revealActive();
	}

	function initTree() {
		const tree = $('#tree');
		if (!tree) return;

		restoreTreeView();

		tree.addEventListener('click', (e) => {
			const trigger = e.target && e.target.closest
				? e.target.closest('.tree-toggle, .tree-folder-label') : null;
			if (!trigger || !tree.contains(trigger)) return;
			const button = trigger.classList.contains('tree-toggle')
				? trigger : trigger.parentElement.querySelector('.tree-toggle');
			setExpanded(button, !isExpanded(button));
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
			const kw = input.value.trim().toLocaleLowerCase();
			const items = $$('li.tree-node', tree);

			if (!kw) {
				items.forEach(item => { item.hidden = false; });
				restoreTreeView();
				return;
			}

			directoryButtons().forEach(button => setExpanded(button, false));
			items.forEach(item => { item.hidden = true; });

			items.filter(item => (item.dataset.treeLabel || '').toLocaleLowerCase().includes(kw))
				.forEach(item => {
					item.hidden = false;
					showAncestors(item);
					if (item.classList.contains('directory')) {
						setExpanded($(':scope > .tree-row > .tree-toggle', item), true);
						$$(':scope .tree-node', item).forEach(child => { child.hidden = false; });
					}
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
		const box = $('#tree li.tree-node.active > .article-toc');
		const content = $('#article-content');
		if (!box || !content) return;

		const headings = $$('h1, h2, h3, h4, h5, h6', content);
		if (!headings.length) return;

		// 标题可能没有 id；补齐并去重，保证每一项都能准确定位。
		const usedIds = new Set($$('[id]').map(el => el.id).filter(Boolean));
		headings.forEach(h => {
			if (h.id) return;
			const base = slugify(h.textContent) || 'section';
			let id = base;
			let suffix = 2;
			while (usedIds.has(id)) id = base + '-' + suffix++;
			h.id = id;
			usedIds.add(id);
		});

		const rootList = document.createElement('ul');
		rootList.className = 'article-toc-list';
		box.innerHTML = '';
		box.appendChild(rootList);
		box.hidden = false;

		// 每个标题持有自己的子列表；遇到同级或更高层级时回退栈，
		// 因此 h2 -> h3 -> h2 会得到两个兄弟章节，而不是一条扁平清单。
		const stack = [{ level: 0, list: rootList }];
		headings.forEach(h => {
			const level = parseInt(h.tagName.slice(1), 10);
			while (stack.length > 1 && level <= stack[stack.length - 1].level) stack.pop();

			const li = document.createElement('li');
			const a = document.createElement('a');
			a.href = '#' + encodeURIComponent(h.id);
			a.dataset.targetId = h.id;
			a.textContent = h.textContent.replace(/#$/, '').trim();
			li.appendChild(a);
			stack[stack.length - 1].list.appendChild(li);

			const children = document.createElement('ul');
			children.className = 'article-toc-children';
			li.appendChild(children);
			stack.push({ level: level, list: children });
		});
		$$('.article-toc-children:empty', rootList).forEach(list => list.remove());

		const links = $$('a[data-target-id]', rootList);
		links.forEach(a => {
			a.addEventListener('click', (e) => {
				e.preventDefault();
				const target = document.getElementById(a.dataset.targetId);
				if (!target) return;
				window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
				history.replaceState(null, '', '#' + encodeURIComponent(a.dataset.targetId));
			});
		});

		// 滚动高亮
		const sync = () => {
			let current = null;
			headings.forEach(h => {
				if (h.getBoundingClientRect().top + window.scrollY <= window.scrollY + 100) current = h;
			});
			links.forEach(a => {
				a.classList.toggle('read', !!current && a.dataset.targetId === current.id);
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
		// 文案来自主题语言文件，不再在 JS 里硬编码
		const TXT = {
			copy: t('copy', '复制', 'Copy'),
			copied: t('copied', '已复制', 'Copied')
		};

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
	initCache();
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
