# 增强 Markdown

这些能力来自 markdown-it 插件（构建期渲染），主题负责呈现与按需加载运行时。

## 启用插件

```yaml
markdown:
  plugins:
    - markdown-it-abbr
    - markdown-it-deflist
    - markdown-it-emoji
    - markdown-it-footnote
    - markdown-it-ins
    - markdown-it-mark
    - markdown-it-sub
    - markdown-it-sup
    - markdown-it-task-lists
    - name: markdown-it-container
      options: tip
    - name: markdown-it-container
      options: warning
    - name: markdown-it-container
      options: danger
    - name: markdown-it-container
      options: info
    - '@vscode/markdown-it-katex'
```

## 图表（Mermaid）

````markdown
```mermaid
graph TD
  A[开始] --> B{判断}
  B -->|是| C[结束]
```
````

Mermaid 只在页面**确实存在图表时**才从 CDN 加载（约 1 MB），没有图表的页面不会引入。
深浅色切换时图表会按 `theme` / `theme_dark` 重新绘制。

```yaml
markdown:
  mermaid:
    enable: true
    version: '12'
    theme: default
    theme_dark: dark
```

## 公式（KaTeX）

```markdown
行内公式 $E = mc^2$，独立公式：

$$
\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}
$$
```

公式由 `@vscode/markdown-it-katex` 在构建期渲染成 HTML，主题只补样式：

```yaml
markdown:
  math:
    enable: true
    version: '0.16.11'    # 需与渲染时使用的 katex 版本一致，否则类名对不上
```

## 提示块

```markdown
:::tip
提示块，同样支持 :::info / :::warning / :::danger
:::
```

## 任务列表、脚注、emoji

```markdown
- [x] 已完成的任务
- [ ] 待办任务

脚注[^1] 与 emoji :tada:

[^1]: 脚注内容
```

## 内嵌 B 站视频

主题自带 `{% bilibili %}` 标签（简写 `{% bili %}`），不需要额外装插件，正文里前后留空行即可：

```markdown
{% bilibili BV1xx411c7mD %}

{% bilibili BV1xx411c7mD 2 %}                    # 第 2 分 P

{% bilibili av170001 %}

{% bilibili BV1xx411c7mD p:2 danmaku:1 ratio:4:3 title:这一节讲的是 GAS %}

{% bilibili https://www.bilibili.com/video/BV1xx411c7mD %}
```

| 参数 | 说明 | 默认 |
| --- | --- | --- |
| `p` / `page` | 分 P，也可以直接写第二个裸数字 | `1` |
| `danmaku` | `1` 开弹幕、`0` 关 | `0` |
| `ratio` | `16/9` 或 `4/3` | `16/9` |
| `hd` | 是否高清 | `1` |
| `title` | 播放器下方显示的文字 | 「在 B 站观看」 |

默认值可以在主题配置里改：

```yaml
plugins:
  bilibili:
    enable: true
    page: 1
    danmaku: false
    ratio: '16/9'
    high_quality: true
```
