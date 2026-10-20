# 笔记区与目录树

## 目录结构就是目录树

笔记照常放在 `source/_posts/`，**目录结构就是侧边栏的树**。
要在目录节点上能点进去，需要在该目录里放一个**同名的 Markdown**：

```
_posts
└── foo/            # 目录会成为树上的一个节点
    ├── bar.md
    └── foo.md      # 与目录同名的文件，作为该节点的落地页
```

节点排序规则：目录优先 + 名称排序。可以用主题配置的 `sidebar.order` 指定某个目录下的子节点顺序：

```yaml
sidebar:
  order:
    'Base Knowledge':
      - Mathematics
      - Computer
      - Artificial Intelligence
```

## 三个入口的分工

同一个内容不在三个地方各列一遍，三个入口各管一个视角：

| 入口 | 视角 | 内容 |
| --- | --- | --- |
| `/` | 精选 | 最近更新的几篇 + 个人名片 |
| `/notes/` | 时间 | 全量笔记流（按更新时间倒序，分页） |
| `/categories/` | 主题 | 一级分区 -> 二级分类 -> 每个分区最新几篇 |

## 分类分区

一级分类的中文名、描述、图标、配色写在主题配置的 `categories` 里（只需登记一级）：

```yaml
categories:
  - key: LLM
    name: LLM / 大模型
    desc: 大模型原理、训练与 Agent 工程化
    icon: brain
    color: violet     # violet | amber | blue | green | rose
```

二级分类由 `_posts` 的目录层级自动推导，不需要登记，配色会沿用所属的一级分类。

## 侧边栏行为

```yaml
sidebar:
  usePostTitle: false   # 节点显示文章标题还是文件名
  default_open: true    # 桌面端默认展开
  search:
    mode: tree          # tree 过滤目录树，google/baidu 跳转站外搜索
    engine: https://www.google.com/search?q=
```

- 宽屏侧栏常驻，可收起；窄屏变抽屉
- 自动展开到当前文章所在节点
- 搜索框过滤节点时保留父级链路，命中节点高亮

## 文章内目录（TOC）

自动生成、滚动高亮，**不依赖渲染器的锚点实现**（自建 slug 兜底，换 renderer 也不会失效）。
层级深度由站点配置的 `toc.maxdepth` 控制：

```yaml
toc:
  maxdepth: 3
```
