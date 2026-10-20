# 页面模式

三种页面形态由 front-matter 的 `layout` 决定，生成器产出的页面（index / category / tag / archive）
`layout` 不一定有值，主题会用 `__index`、`is_home()` 兜底。

| `layout` | 形态 | 侧边栏 |
| --- | --- | --- |
| `home` | 全宽个人主页 | 无 |
| `page` | 常规页（关于、作品集…） | 无 |
| 未指定 / `wiki` | 常规页 | 有 |
| `post` | 笔记正文 | 有 |

任意页面都可以用 front-matter 强制开关侧边栏：

```yaml
wiki: true     # 强制带目录树
```

## 用法示例

个人主页：

```markdown
---
title: Home
layout: home
---
```

独立页面（无侧边栏）：

```markdown
---
title: About
layout: page
---
```

让一篇普通页面带上目录树：

```markdown
---
title: 专题索引
wiki: true
---
```

## 模式是怎么决定的

`layout.ejs` 里按这个顺序判断：

1. `page.layout` 是 `home` / `landing` → `home`
2. `page.wiki === true`，或 `layout` 是 `notes` / `index` / `category` / `tag` / `archive`，
   或 `page.__index === true`，或 `is_home()` / `is_post()` → `wiki`
3. 其余 → `page`

模式会写到 `<body class="mode-xxx">` 上，样式按这个类名切换；
同时决定侧边栏是否渲染、内容容器是否全宽。
