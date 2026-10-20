# Hexo-theme-Hybrid

把**个人主页**和 **Wiki 式笔记库**放进同一个 Hexo 主题。

站点首页是你的个人主页（名片、自述、经历、开源项目、学术成果、最近更新），
笔记区则是另一套页面：左侧一棵目录树，展开即读。两套形态共用同一套设计系统。

```bash
git submodule add https://github.com/HUSTJJD/Hexo-theme-Hybrid.git themes/hybrid
```

→ [安装](installation.md) · [个人主页](homepage.md) · [笔记区](notes.md) · [配置](configuration.md)

## Features

- **三种页面模式** —— `home` 全宽个人主页 / `page` 常规页 / `wiki` 带目录树，由 front-matter 的 `layout` 决定
- **首页区块数据驱动** —— 名片、工作经历、教育经历、开源项目、论文专利全部写在 `source/_data/*.yml`，改内容不用碰模板
- **目录树导航** —— 由 `_posts` 的目录结构自动构建，可折叠、可过滤、自动展开到当前文章
- **原生暗色模式** —— CSS 变量实现，可跟随系统、可手动切换并记忆，无第三方依赖
- **文章内目录（TOC）** —— 自动生成、滚动高亮，不依赖渲染器的锚点实现
- **响应式** —— 宽屏侧栏常驻并可收起，窄屏变抽屉
- **多语言** —— 内置 10 种语言文件，界面文案（含 aria 标签、JS 文案）全部走 i18n，缺键回退到 `default.yml`
- **增强 Markdown** —— Mermaid 图表、KaTeX 公式、提示块、任务列表、脚注、emoji、上下标、缩写
- **B 站视频嵌入** —— 内置 `{% bilibili %}` 标签，BV / av 号、分 P、弹幕、比例都可调
- **分类只在一处展开** —— `/categories/` 是唯一的「主题 -> 文章」地图，`/notes/` 走时间线，首页只看精选

## 两种形态，一套设计令牌

| | 个人主页 | 笔记区 |
| --- | --- | --- |
| 入口 | `/` | `/notes/`、`/categories/`、文章页 |
| 侧边栏 | 无（全宽） | 目录树 |
| 内容来源 | `source/_data/*.yml` + `source/index.md` | `source/_posts/` |
| 导航 | 顶栏菜单 + 页内锚点 | 目录树 + 主题分区 |

## 站点结构建议

```
_config.yml          theme: hybrid
_config.hybrid.yml   站点专属信息（图标、外链账号）
source/
├── index.md         首页自述（layout: home）
├── _data/           首页各区块的数据源
│   ├── profile.yml  名片、要点、技能
│   ├── works.yml    WORKS / EDUCATION
│   ├── projects.yml PROJECTS（开源项目）
│   ├── papers.yml   PAPERS / PATENTS
│   └── home.yml     首页通用文案
└── _posts/          笔记，目录结构即目录树
```

## 与 Node-Tree 的差异

目录树引擎来自 [hexo-theme-node-tree](https://github.com/Exisi/hexo-theme-node-tree)，
在它之上做了这些定制：

- **去掉 PJAX** —— 多页面模式下各页 DOM 结构不同，无刷新加载会串味，改为整页加载
- **暗色模式改为原生实现** —— 原主题用 DarkReader（CDN + 运行时注入），这里换成 CSS 变量，不再依赖外部脚本，也没有刷新闪烁
- **样式全部重写** —— 独立的设计令牌（tokens / base / home / wiki），不引任何 CSS 框架
- **新增 home、page、archive、category、tag 布局**，并让侧边栏按模式开关
- **JS 全部判空** —— 个人主页没有侧边栏和目录树，所有模块都做了空值防御
- **TOC 不依赖渲染器锚点** —— 自建 slug 兜底，换 renderer 也不会失效
- **文案抽成 i18n** —— 原主题硬编码在模板里的文案改为语言文件

## Acknowledgements

Hybrid 的目录树引擎——树形结构构建、节点展开/折叠、节点过滤、文章内目录与图片灯箱——
来自 [**hexo-theme-node-tree**](https://github.com/Exisi/hexo-theme-node-tree) by [Exisi](https://github.com/Exisi)，MIT 协议。

而 node-tree 本身又衍生自 [**hexo-theme-tree**](https://github.com/wujun234/hexo-theme-tree) by wujun234，同样感谢。

主题图标与交互中用到的 [Font Awesome 4.7](https://fontawesome.com/v4.7.0/)，以及 [Hexo](https://hexo.io) 本身。

## License

[MIT](https://github.com/HUSTJJD/Hexo-theme-Hybrid/blob/main/LICENSE) © 2026 HUSTJJD

衍生自 hexo-theme-node-tree（MIT © 2024 Exisi），其原始许可声明保留在 `LICENSE-node-tree`。
