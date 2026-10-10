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
	   --------------------------------------------------------- */
	function initSidebar() {
		const sidebar = $('#sidebar');
		const toggle = $('#sidebar-toggle');
		if (!sidebar || !toggle) return;

		const isNarrow = () => window.matchMedia('(max-width: 1100px)').matches;

		const setCollapsed = (collapsed) => {
			sidebar.classList.toggle('is-collapsed', collapsed);
			document.body.classList.toggle('sidebar-collapsed', collapsed);
			const icon = toggle.querySelector('i');
			if (icon) {
				icon.classList.toggle('fa-arrow-right', collapsed);
				icon.classList.toggle('fa-times', !collapsed);
			}
		};

		// 初始状态：窄屏收起，宽屏展开
		setCollapsed(isNarrow());

		toggle.addEventListener('click', () => {
			setCollapsed(!sidebar.classList.contains('is-collapsed'));
		});

		// 窄屏点击侧边栏外部关闭
		document.addEventListener('click', (e) => {
			if (!isNarrow()) return;
			if (!e.target.closest('#sidebar') && !e.target.closest('#sidebar-toggle') &&
				!sidebar.classList.contains('is-collapsed')) {
				setCollapsed(true);
			}
		});
	}

	/* ---------------------------------------------------------
	   目录树：展开 / 折叠
	   --------------------------------------------------------- */
	function toggleNode(node) {
		if (!node) return;
		const nodeUl = node.closest('ul');
		if (!nodeUl) return;

		const dirIcon = node.querySelector('.fa');

		if (dirIcon && dirIcon.classList.contains('fa-minus-square-o')) {
			$$(':scope > ul', nodeUl).forEach(ul => { ul.style.display = 'none'; });
			dirIcon.classList.replace('fa-minus-square-o', 'fa-plus-square-o');
			return;
		}

		$$(':scope > ul', nodeUl).forEach(ul => { ul.style.display = 'block'; });
		if (dirIcon) dirIcon.classList.replace('fa-plus-square-o', 'fa-minus-square-o');
	}

	function showPath(node, withSiblings) {
		if (!node || node.id === 'tree') return;

		const tag = node.tagName.toLowerCase();
		if (tag === 'ul') {
			node.style.display = 'block';
			if (withSiblings) {
				Array.from(node.parentNode.children).forEach(child => {
					child.style.display = child.tagName.toLowerCase() === 'a' ? 'inline' : 'block';
					const icon = child.querySelector && child.querySelector('.fa-plus-square-o');
					if (icon) icon.classList.replace('fa-plus-square-o', 'fa-minus-square-o');
				});
			}
		}

		showPath(node.parentElement, withSiblings);
		if (tag === 'a') toggleNode(node);
	}

	function initTree() {
		const tree = $('#tree');
		if (!tree) return;

		// 展开到当前激活节点
		const active = $('#tree .active');
		if (active) showPath(active, true);

		// 点击目录节点展开/折叠
		document.addEventListener('click', (e) => {
			if (e.target.matches('#tree li.file > a, #tree li.directory > a')) {
				e.preventDefault();
				toggleNode(e.target);
			}
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
				$$('#tree ul', tree).forEach(ul => { ul.style.display = ''; });
				$$('#tree li.file > a, #tree li.directory > a').forEach(a => {
					a.style.display = '';
				});
				const active = $('#tree .active');
				if (active) showPath(active, true);
				return;
			}

			// 先全部收起并隐藏，再展开命中项
			$$('#tree ul', tree).forEach(ul => { ul.style.display = 'none'; });
			$$('#tree li.file > a, #tree li.directory > a').forEach(a => { a.style.display = 'none'; });

			const hits = $$('#tree li a').filter(a => a.textContent.includes(kw));
			hits.forEach(a => {
				a.style.display = 'block';
				showPath(a.parentElement, false);
			});
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
		const box = $('.article-toc');
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
	initCodeCopy();
})();
