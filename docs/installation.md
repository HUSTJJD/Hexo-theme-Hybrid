# 安装

## 安装主题

直接克隆：

```bash
cd your-hexo-site
git clone https://github.com/HUSTJJD/Hexo-theme-Hybrid.git themes/hybrid
```

或者用 submodule（推荐，便于跟随更新）：

```bash
git submodule add https://github.com/HUSTJJD/Hexo-theme-Hybrid.git themes/hybrid
```

更新子模块：

```bash
git submodule update --remote themes/hybrid
```

!!! warning "CI 上要注意缓存"
    如果你在 GitHub Actions 里缓存了 `themes` 目录，主题升级后可能被旧缓存顶回去。
    `restore-keys` 前缀命中旧缓存时会覆盖刚 checkout 的子模块，建议不要把 `themes`
    放进缓存路径，或把子模块的 gitlink SHA 一起算进 cache key。

然后在站点 `_config.yml` 里启用：

```yaml
theme: hybrid
```

## 把 `/` 让给个人主页

默认 Hexo 会把文章列表放在根路径。个人主页形态建议把笔记列表挪走：

```yaml
index_generator:
  path: notes      # 笔记列表迁到 /notes/
  per_page: 20
  order_by: -updated
```

## 安装增强 Markdown 依赖

```bash
npm i hexo-renderer-markdown-it markdown-it-emoji markdown-it-footnote \
      markdown-it-task-lists markdown-it-container markdown-it-deflist \
      markdown-it-abbr markdown-it-sub markdown-it-sup markdown-it-ins \
      markdown-it-mark @vscode/markdown-it-katex
```

并在站点 `_config.yml` 启用插件，详见[增强 Markdown](markdown.md)。

## 推荐的高亮引擎

```yaml
syntax_highlighter: prismjs
prismjs:
  enable: true
  line_number: true
```

prism 有 597 个语言组件（含 `hlsl`、`wgsl`、`unrealscript`、`glsl`），
且 hexo 会按需加载对应组件，新增语言无需改配置。
highlight.js 只有 192 种且缺少 hlsl / wgsl。

## 检查安装

```bash
hexo clean && hexo generate
```

打开 `public/index.html`，能看到 Hero 与自述正文即说明主题已生效。
