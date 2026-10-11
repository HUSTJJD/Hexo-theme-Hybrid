/* global hexo */
'use strict';

/* ------------------------------------------------------------
   Wiki 笔记的「上一篇 / 下一篇」
   ------------------------------------------------------------
   Hexo 内置的 post generator 按 site.posts.sort('-date') 排全站文章，
   再把相邻两篇挂到 page.prev / page.next 上（prev = 更新的一篇）。
   对博客没错，对 Wiki 是错的：「Enumerate」的上一篇会变成 Unreal Engine
   的「Game Ability System」，仅仅因为两篇发布时间相邻，和目录结构毫无关系。

   这里改成按侧边栏目录树的顺序取相邻笔记，规则与 _partial/sidebar.ejs
   里 showTree() 完全一致：
     1. 同一层里目录排在文件前面
     2. 同类型按节点名 localeCompare
     3. 目录的索引笔记（与目录同名的那篇）就是目录行本身，排在它的子项之前
   于是「上一篇 / 下一篇」就是目录树上左右相邻的两个节点。

   挂在 template_locals 过滤器上：它在 generator 之后、渲染之前执行，
   正好覆盖掉 Hexo 写入的 prev / next，且不需要改动主题子模块。
   ------------------------------------------------------------ */

// 文章在目录树里的位置以 _posts 的实际目录为准；slug 只作为旧数据兜底。
function treePath(post) {
  const raw = post && post.source ? String(post.source) : String((post && post.slug) || '');
  return raw.replace(/\\/g, '/')
    .replace(/^_posts\//, '')
    .replace(/\.md$/i, '')
    .replace(/^\/+|\/+$/g, '');
}

function newNode(name) {
  return { name, children: new Map(), post: null };
}

function isDir(node) {
  return node.children.size > 0;
}

// 同一层的排序：目录在前，其余按名称字典序
function compareNode(a, b) {
  const aDir = isDir(a);
  const bDir = isDir(b);
  if (aDir !== bDir) return aDir ? -1 : 1;
  return a.name.localeCompare(b.name);
}

// 把 slug 还原成目录树
function buildTree(posts) {
  const root = newNode('');

  posts.forEach(function (post) {
    const chain = treePath(post).split('/');
    if (!chain[0]) return;

    let node = root;
    chain.forEach(function (seg) {
      if (!node.children.has(seg)) node.children.set(seg, newNode(seg));
      node = node.children.get(seg);
    });
    node.post = post;
  });

  return root;
}

function emitChildren(node, out, skip) {
  const kids = Array.from(node.children.values())
    .filter(function (kid) { return kid !== skip; })
    .sort(compareNode);

  kids.forEach(function (kid) { emitNode(kid, out); });
}

function emitNode(node, out) {
  // 文件节点
  if (!isDir(node)) {
    if (node.post) out.push(node.post);
    return;
  }

  // 目录节点：与目录同名的子项就是它的索引笔记，先输出，再输出其余子项
  const indexNode = node.children.get(node.name);
  const hasIndex = indexNode && !isDir(indexNode) && indexNode.post;
  if (hasIndex) out.push(indexNode.post);
  emitChildren(node, out, hasIndex ? indexNode : null);
}

let treeOrder = null;

function orderedPosts() {
  if (treeOrder) return treeOrder;

  const out = [];
  emitChildren(buildTree(hexo.locals.get('posts').toArray()), out, null);
  treeOrder = out;
  return treeOrder;
}

// 每次 generate 重新计算（hexo server 下文件改动也会重走一遍）
hexo.extend.filter.register('before_generate', function () {
  treeOrder = null;
});

hexo.extend.filter.register('template_locals', function (locals) {
  const page = locals && locals.page;
  if (!page) return locals;

  // 只处理 _posts 下的笔记，索引页 / about 之类不动
  const isPost =
    page.__post === true ||
    (typeof page.source === 'string' && page.source.indexOf('_posts/') === 0);
  if (!isPost) return locals;

  const ordered = orderedPosts();
  const idx = ordered.findIndex(function (post) { return post._id === page._id; });
  if (idx < 0) return locals;

  page.prev = idx > 0 ? ordered[idx - 1] : null;
  page.next = idx < ordered.length - 1 ? ordered[idx + 1] : null;

  return locals;
});
