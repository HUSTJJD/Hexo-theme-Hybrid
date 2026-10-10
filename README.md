# Hexo-theme-Hybrid

把**个人主页**和 **Wiki 式笔记库**放进同一个 Hexo 主题。

站点首页是你的个人主页（名片、技能、经历时间线、最近更新），
笔记区则是另一套页面：左侧一棵目录树，展开即读。两套形态共用同一套设计系统。

## Features

- **三种页面模式** —— `home` 全宽个人主页 / `page` 常规页 / `wiki` 带目录树，由 front-matter 的 `layout` 决定
- **目录树导航** —— 由 `_posts` 的目录结构自动构建，可折叠、可过滤、自动展开到当前文章
- **个人主页数据驱动** —— 名片、技能、经历、教育都写在 `source/_data/*.yml`，改内容不用碰模板
- **原生暗色模式** —— CSS 变量实现，默认跟随系统，可手动切换并记忆，无第三方依赖
- **文章内目录（TOC）** —— 自动生成、滚动高亮，不依赖渲染器的锚点实现
- **响应式** —— 宽屏侧栏常驻并可收起，窄屏变抽屉
- **多语言** —— 内置 10 种语言文件，缺键回退到 `default.yml`

## Installation

```bash
cd your-hexo-site
git clone https://github.com/HUSTJJD/Hexo-theme-Hybrid.git themes/hybrid
```

或者用 submodule（推荐，便于跟随更新）：

```bash
git submodule add https://github.com/HUSTJJD/Hexo-theme-Hybrid.git themes/hybrid
```

然后在站点 `_config.yml` 里启用：

```yaml
theme: hybrid
```

建议把笔记列表从根路径挪走，把 `/` 让给个人主页：

```yaml
index_generator:
  path: notes      # 笔记列表迁到 /notes/
  per_page: 20
  order_by: -updated
```

## Usage

### 1. 个人主页

新建 `source/index.md`：

```markdown
---
title: 首页
layout: home
---

写一句自我介绍，会显示在 Hero 下方。
```

主页的数据来自两个文件，按需修改：

| 文件 | 作用 |
| --- | --- |
| `source/_data/profile.yml` | 姓名、简介、联系方式、技能卡片 |
| `source/_data/resume.yml` | 工作经历与教育经历的时间线 |

```yaml
# source/_data/profile.yml
name: 你的名字
tagline: 一句话简介
meta:
  - icon: map-marker
    text: 城市
  - icon: github
    text: GitHub
    url: 'https://github.com/you'
skills:
  - name: Programming
    desc: 描述
    tags: [C++, Python]
```

```yaml
# source/_data/resume.yml
experience:
  - title: 项目 / 产品名
    role: 职位
    org: 公司
    period: 2023.03 - 至今
    points:
      - 做了什么
education:
  - title: 专业
    role: 硕士
    org: 学校
    period: 2020.09 - 2023.06
```

### 2. 笔记区

笔记照常放在 `source/_posts/`，**目录结构就是侧边栏的树**。
要在目录节点上能点进去，需要在该目录里放一个**同名的 Markdown**：

```
_posts
└── foo/            # 目录会成为树上的一个节点
    ├── bar.md
    └── foo.md      # 与目录同名的文件，作为该节点的落地页
```

笔记入口 `/notes/` 顶部会渲染分类卡片，配色与图标在主题配置的 `notes.categories` 里定义。

### 3. 页面模式

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

### 4. 配置

站点根目录建 `_config.hybrid.yml` 覆盖主题默认值，不要直接改主题目录（尤其用 submodule 时）。
可配置项见 [`_config.yml`](_config.yml)：导航菜单、社交图标、外观、
分类卡片、代码高亮、版权、页脚统计、giscus 评论、百度/谷歌统计、自定义 CSS/JS。

## 与 Node-Tree 的差异

目录树引擎来自 [hexo-theme-node-tree](https://github.com/Exisi/hexo-theme-node-tree)，
在它之上做了这些定制：

- **去掉 PJAX** —— 多页面模式下各页 DOM 结构不同，无刷新加载会串味，改为整页加载
- **暗色模式改为原生实现** —— 原主题用 DarkReader（CDN + 运行时注入），这里换成 CSS 变量，
  不再依赖外部脚本，也没有刷新闪烁
- **样式全部重写** —— 独立的设计令牌（tokens / base / home / wiki），不引任何 CSS 框架
- **新增 home、page、archive、category、tag 布局**，并让侧边栏按模式开关
- **JS 全部判空** —— 个人主页没有侧边栏和目录树，所有模块都做了空值防御
- **TOC 不依赖渲染器锚点** —— 自建 slug 兜底，换 renderer 也不会失效
- **文案抽成 i18n** —— 原主题硬编码在模板里的文案改为语言文件

## Acknowledgements

Hybrid 的目录树引擎——树形结构构建、节点展开/折叠、节点过滤、文章内目录与图片灯箱——
来自 [**hexo-theme-node-tree**](https://github.com/Exisi/hexo-theme-node-tree)
by [Exisi](https://github.com/Exisi)，MIT 协议。非常感谢这个优秀的项目，
没有它就没有这套笔记浏览体验。

而 node-tree 本身又衍生自 [**hexo-theme-tree**](https://github.com/wujun234/hexo-theme-tree)
by wujun234，同样感谢。

主题图标与交互中用到的 [Font Awesome 4.7](https://fontawesome.com/v4.7.0/)，
以及 [Hexo](https://hexo.io) 本身。

## License

[MIT](LICENSE) © 2026 HUSTJJD

衍生自 hexo-theme-node-tree（MIT © 2024 Exisi），其原始许可声明保留在
[LICENSE-node-tree](LICENSE-node-tree)。
