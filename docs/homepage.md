# 个人主页

首页由两部分拼起来：**数据文件**提供各区块的内容，`source/index.md` 提供自述正文。
改内容只需要动这两处，不用碰模板。

## 1. 建首页

新建 `source/index.md`：

```markdown
---
title: Home
layout: home
comments: false
---

## About

写一段自我介绍，会显示在 Hero 下方。
```

`layout: home` 决定走全宽个人主页模板。

## 2. 数据源一览

| 文件 | 区块 | 说明 |
| --- | --- | --- |
| `_data/profile.yml` | Hero | 姓名、一句话简介、联系方式、要点列表、技能 |
| `_data/home.yml` | 通用文案 | 眉标、按钮、区块标题 |
| `_data/works.yml` | WORKS / EDUCATION | 工作与学习经历，按组织分组 |
| `_data/projects.yml` | PROJECTS | 开源项目卡片 |
| `_data/papers.yml` | PAPERS / PATENTS | 论文与专利 |

所有区块都是**可选**的：对应的 yml 不存在或为空时，整块不会渲染，页面不会留空洞。

## 3. profile.yml：Hero

```yaml
name: Jundou Jiang
tagline: Game Client Engineer at Tencent Tianmei · AI for Science
avatar: https://example.com/avatar.jpeg

meta:
  - icon: graduation-cap      # font-awesome 4.7 类名，不含 fa- 前缀
    text: M.Eng. Computer Technology
  - icon: map-marker
    text: Shanghai
  - icon: envelope
    text: you@example.com
    url: 'mailto:you@example.com'
  - icon: github
    text: yourname
    url: 'https://github.com/yourname'

# Hero 下方的一句话要点列表
highlights:
  - Currently building core gameplay for a game title.
  - Always open to interesting collaborations.

skills:
  - name: Machine Learning
    desc: LLM / Agent engineering and generative models.
    tags:
      - LLM
      - Agent
```

## 4. home.yml：通用文案

首页文案（眉标、按钮、区块标题）集中在这里，方便整页换语言：

```yaml
eyebrow: HI, THERE!      # Hero 顶部小标
enter: Browse notes
docs: Docs
source: Source
more: More
latest: LATEST FROM BLOG
```

## 5. works.yml：WORKS 与 EDUCATION

工作经历与学习经历按组织分组，组内是该段时间做的事：

```yaml
experience:
  title: WORKS
  icon: briefcase
  groups:
    - org: Tencent Tianmei T1 Studio
      role: Game Client Engineer
      period: 2023.03 – Present
      location: Shanghai
      items:
        - name: DreamStar
          desc: Core gameplay development — skills, interactive objects, 3C.

education:
  title: EDUCATION
  icon: graduation-cap
  groups:
    - org: Sichuan University
      role: M.Eng. in Computer Technology
      period: 2020.09 – 2023.06
      items:
        - name: State Key Laboratory of Numerical Simulation
          desc: Deep learning for CFD and mesh generation.
```

## 6. projects.yml：PROJECTS

```yaml
title: PROJECTS
icon: code

projects:
  - name: UnLuaNova
    tagline: A Lua scripting solution for Unreal Engine
    desc: Community continuation of Tencent/UnLua.
    icon: code
    url: https://example.com/docs/      # 文档站，留空则不显示 Docs 按钮
    repo: https://github.com/you/UnLuaNova   # 填了就渲染 GitHub Star 按钮
    tags:
      - C++
      - Lua
    status: Early refactor
```

`repo` 会渲染成 [GitHub 官方按钮](https://buttons.github.io/)（Star + star 数），
脚本只在首页按需加载，其他页面不会引入。

!!! tip "经历与开源项目要分开"
    职业经历写 `works.yml`，开源项目写 `projects.yml`。
    前者是「在哪儿做了什么」，后者是「自己发起/维护的东西」，不要混在一起。

## 7. papers.yml：PAPERS 与 PATENTS

```yaml
papers:
  title: PAPERS
  icon: file-text-o
  items:
    - title: 'TransCFD: A transformer-based decoder for flow field prediction'
      authors: Jundou Jiang, Guanxiong Li, Yi Jiang
      venue: Engineering Applications of Artificial Intelligence, 2023
      note: JCR Q1
      url: https://doi.org/10.1016/j.engappai.2023.106340

patents:
  title: PATENTS
  icon: certificate
  items:
    - title: A method for ...
      authors: Jundou Jiang, et al.
      venue: CN202211469160.1
      note: Granted
```

!!! warning "YAML 里含冒号的值必须加引号"
    `title: TransCFD: A decoder` 会解析失败，要写成 `title: 'TransCFD: A decoder'`。

## 8. 最近更新

首页底部自动取全站最近更新的笔记，条数由主题配置的 `notes.recent_count` 决定。
