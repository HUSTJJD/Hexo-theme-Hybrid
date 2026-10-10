/* global hexo */
'use strict';

/* ============================================================
   分类分组
   ------------------------------------------------------------
   Hexo 的 site.categories 是一张扁平表：一级分类（Unreal Engine）
   和二级分类（GamePlay）平级，且父分类的 posts 已经包含子孙文章。
   直接在页面上遍历它，就会得到「Unreal Engine 42 篇」和
   「GamePlay 9 篇」混在一起的效果 —— 看上去就是重复计数。

   这里把扁平表整理成「一级分组 -> 二级分类」的两级地图：
     · 分组（group）：一级分类 + 元数据（中文名 / 图标 / 颜色 / 描述）
     · 子分类：挂在分组下的二级分类，按文章数倒序
   页面只消费这份结构，不再自己遍历 site.categories。
   ============================================================ */

// 主题配置里的分组元数据，兼容旧的 notes.categories
function catMetaList() {
	const theme = (hexo.theme && hexo.theme.config) || {};
	const list = theme.categories ||
		(theme.notes && theme.notes.categories) ||
		[];
	return Array.isArray(list) ? list : (list.groups || []);
}

function catMetaMap() {
	const map = {};
	catMetaList().forEach(function (m) {
		if (m && m.key) map[String(m.key).toLowerCase()] = m;
	});
	return map;
}

// 全部分类（已由 Hexo 过滤掉 0 篇的分类）+ id 索引
function catIndex() {
	const cats = hexo.locals.get('categories').toArray();
	const byId = {};
	cats.forEach(function (c) { byId[c._id] = c; });
	return { list: cats, byId: byId };
}

function catSortPosts(query, limit) {
	let q = query.sort('updated', -1);
	if (limit > 0) q = q.limit(limit);
	return q.toArray();
}

// 往上走到一级分类
function catTopOf(cat, all) {
	let top = cat;
	let guard = 0;
	while (top.parent && all.byId[top.parent] && guard++ < 16) {
		top = all.byId[top.parent];
	}
	return top;
}

function catDescribe(cat, opts, all, metas) {
	let meta = metas[String(cat.name).toLowerCase()] || {};

	// 二级分类通常没有登记元数据，配色和图标沿用它所属的一级分类
	const top = catTopOf(cat, all);
	if (top !== cat) {
		const topMeta = metas[String(top.name).toLowerCase()] || {};
		meta = Object.assign({
			color: topMeta.color || 'blue',
			icon: topMeta.icon || 'folder-open'
		}, meta);
	}

	const children = all.list
		.filter(function (c) { return c.parent && String(c.parent) === String(cat._id); })
		.sort(function (a, b) {
			return (b.posts.length - a.posts.length) || a.name.localeCompare(b.name);
		});

	return {
		cat: cat,
		key: cat.name,
		name: meta.name || cat.name,
		desc: meta.desc || '',
		icon: meta.icon || 'folder-open',
		color: meta.color || 'blue',
		count: cat.posts.length,
		children: children,
		posts: catSortPosts(cat.posts, opts.recent)
	};
}

/* ---------------------------------------------------------
   cat_groups({ recent: 5 })
   返回一级分组数组，供 /categories/ 与 /notes/ 的分类导航使用。
   排序：主题配置里写过的按配置顺序，其余按文章数倒序。
   --------------------------------------------------------- */
hexo.extend.helper.register('cat_groups', function (opts) {
	opts = opts || {};
	if (typeof opts.recent !== 'number') opts.recent = 0;

	const all = catIndex();
	const metas = catMetaMap();
	const order = catMetaList().map(function (m) {
		return String((m && m.key) || '').toLowerCase();
	});

	const groups = all.list
		.filter(function (c) { return !c.parent; })
		.map(function (c) { return catDescribe(c, opts, all, metas); });

	groups.sort(function (a, b) {
		const ia = order.indexOf(String(a.key).toLowerCase());
		const ib = order.indexOf(String(b.key).toLowerCase());
		if (ia !== -1 && ib !== -1) return ia - ib;
		if (ia !== -1) return -1;
		if (ib !== -1) return 1;
		return b.count - a.count;
	});

	return groups;
});

/* ---------------------------------------------------------
   cat_detail(name, { recent: 0 })
   单个分类页用：除了分组信息，还回溯出它的一级分类（面包屑用）。
   --------------------------------------------------------- */
hexo.extend.helper.register('cat_detail', function (name, opts) {
	if (!name) return null;
	opts = opts || {};
	if (typeof opts.recent !== 'number') opts.recent = 0;

	const all = catIndex();
	const metas = catMetaMap();

	let cat = null;
	for (let i = 0; i < all.list.length; i++) {
		if (all.list[i].name === name) { cat = all.list[i]; break; }
	}
	if (!cat) return null;

	const info = catDescribe(cat, opts, all, metas);

	// 往上走到一级分类；自己就是一级时 top 为 null
	const top = catTopOf(cat, all);
	if (top !== cat) {
		const topMeta = metas[String(top.name).toLowerCase()] || {};
		info.top = { cat: top, name: topMeta.name || top.name, color: topMeta.color || 'blue' };
	} else {
		info.top = null;
	}

	return info;
});
