# 配置

## 定制方式

定制直接改主题源码（`_config.yml`、`layout/`、`source/css/`、`scripts/`），**不要用站点级补丁**
（根目录 `scripts/*.js` 覆盖钩子、`custom.css.path` 注入额外 CSS）。

理由：Hexo 的主题配置是 deepMerge，站点级只能覆盖键值、删不掉主题自带的项；
靠 filter 和额外 CSS 去打补丁，等于把一份定制拆散在三四个地方，改一处要记着另外几处。

唯一例外是**站点专属且不该进共用主题的信息**（站点图标、GitHub / 邮箱等外链账号），
放站点根目录的 `_config.hybrid.yml`：

```yaml
# _config.hybrid.yml
favicon:
  light: /favicon-white.ico
  dark: /favicon.ico

social:
  github:
    enable: true
    url: 'https://github.com/you'
  email:
    enable: true
    url: 'mailto:you@example.com'
```

## version：发版开关

```yaml
version: '5'
```

`version` 是**发版开关**，改版后必须 +1：

1. css / js 的 URL 会带上 `?v=<version>`，浏览器重新拉取文件，不再吃旧缓存
2. 本地缓存会统一换成 `hybrid:v<version>:*` 前缀，上一版残留的状态在启动时被清掉，
   深浅色与侧栏偏好自动迁移

## 站点标识与导航

```yaml
brand:
  name: ''       # 顶栏左侧站点名，留空则用 config.title
  avatar: true   # 顶栏是否显示头像

menu:
  首页:
    url: /
    icon: home
  笔记:
    url: /notes/
    icon: sitemap

social:
  github:
    enable: true
    url: 'https://github.com/you'
    icon: github
  rss:
    enable: false
    url: /atom.xml
    icon: rss
```

`icon` 使用 font-awesome 4.7 的类名（不含 `fa-` 前缀）。

## 外观

```yaml
appearance:
  color_scheme: dark    # auto | light | dark
  backdrop: grid        # none | grid | dots
  hide_header_on_scroll: false
```

两套色板在 `source/css/tokens.css`：浅色为 `:root`，深色为 `html[data-scheme="dark"]`
与 `prefers-color-scheme: dark` 下的 `html[data-scheme="auto"]`。改配色只动这个文件即可。

## 实时数据（star / fork / 引用数）

```yaml
metrics:
  enable: true
  cache_ttl: 6          # 缓存小时数；0 = 每次刷新都请求
  github:
    enable: true
    fields:             # stars | forks | issues | watchers | updated
      - stars
      - forks
  citation:
    enable: true
    provider: openalex  # openalex | semanticscholar
    mailto: ''          # OpenAlex 的礼貌参数，填邮箱能进「好公民池」
    api_key: ''         # Semantic Scholar 的 key，可选
  sort:
    projects: true      # 项目按 star 数倒序
    papers: true        # 论文按引用数倒序
```

`sort` 在数据到位后重排对应区块：yml 里随便怎么写顺序，页面上都按主指标从高到低排。
没拿到数据的条目留在原位并沉到末尾；整块都没数据就保持 yml 的顺序不动。

数据由 `js/metrics.js` 在前端拉取（`api.github.com` / `api.openalex.org`，都免 key）：

- 先读 `localStorage` 缓存，未过期就不发请求——既是省限流，也让数字立刻就位
- 请求失败时：有旧缓存继续显示旧值，没有就整块移除，不留占位符
- `enable: false` 后项目卡退回 GitHub 官方按钮（`buttons.github.io`），论文不再显示引用数

数据源取自 `projects.yml` 的 `repo` 与 `papers.yml` 的 `doi`（或从 `url` 里的 doi.org 推导），
字段说明见[个人主页文档](homepage.md)。

!!! warning "GitHub 未认证限流 60 次/小时/IP"
    `cache_ttl` 不建议设成 0。真被限流时会自动退到 shields.io 补 star / fork，
    但那个源只给这两个字段。

## 代码块

```yaml
code:
  copyBtn:
    enable: true
```

token 配色写在 `css/code-tokens.css`，跟随深浅色，不需要额外加载 CDN 主题文件。
高亮引擎由站点 `_config.yml` 的 `syntax_highlighter` 决定（推荐 prismjs）。

## 文章版权

```yaml
post:
  copyright:
    enable: true
    license: 'BY'     # BY | BY-SA | BY-ND | BY-NC | BY-NC-SA | BY-NC-ND | ZERO
    author:
      enable: true
    updateDate:
      enable: true
      format: "LL"
```

## 页脚与统计

```yaml
footer:
  since: 2024
  statistics:
    vercount:
      enable: true
      src: https://cn.vercount.one/js

analytics:
  baidu:
    enable: false
    hm: ''
  google:
    enable: false
    id: ''
```

## 评论（giscus）

```yaml
comment:
  giscus:
    enable: true
    repo: you/your-repo
    repo_id: ''
    category: Announcements
    category_id: ''
    mapping: pathname
    strict: 0
    reactions_enabled: 1
    emit_metadata: 0
    input_position: bottom
    theme: preferred_color_scheme
```

## 自定义 CSS / JS

```yaml
custom:
  css:
    path:
      - /css/custom.css
  js:
    path:
```

路径相对站点根目录，会自动带上 `?v=<version>`。
