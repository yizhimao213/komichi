# haklex 节点写法

文稿、手记、关于页的正文走 `markdownToLexical`。`> [!NOTE]`、`::: banner` / `::: details`、`$$...$$` 先抬成 Lexical 节点；其余 Markdown 走 transformer；单独成行的 LiteXML 走 `@haklex/rich-litexml`。front matter、友人帐、项目、一言、思考仍按 `docs/CONTENT.md`。

对照页：https://haklex.innei.dev/nodes  
本站样例：`/posts/haklex-nodes`  
导入入口：`src/haklex/markdown.js`

## 先用这些

标题、段落、列表、链接、图片、代码、引用、分割线、表格、待办、GitHub Alert、`::: banner` / `::: details`、公式、剧透、脚注。

文稿/手记目录只认正文里的 `##` 和 `###`。

## 文本

| 效果 | 写法 |
| --- | --- |
| 粗体 | `**粗体**` |
| 斜体 | `*斜体*` |
| 删除线 | `~~删除~~` |
| 行内代码 | `` `code` `` |
| 下划线 | `++下划线++` |
| 上标 | `^上标^` |
| 下标 | `~下标~` |
| 剧透 | `\|\|点开才看见\|\|` |
| 链接 | `[文字](https://example.com)` |
| 提及 | `[显示名]{github@handle}` 或 `{github@handle}` |
| 注释 | `<!-- 页面上看不见 -->` |
| 注音 | `<ruby>漢字<rt>かんじ</rt></ruby>` |

```md
这句里有 **重点**、*语气*、~~划掉~~、++强调++ 和 ||剧透||。
水的分子式是 H~2~O。面积公式是 πr^2^。
```

`handle` 只能是字母数字、点、连字符。平台名用字母数字。

## 标题、列表、引用、分割线

```md
## 第二节

### 小节

- 无序
1. 有序
- [ ] 待办
- [x] 已做

> 普通引用

---
```

分割线写成单独一行的 `---`、`***` 或 `___`。front matter 的 `---` 在正文之前，互不影响。

## 图片

```md
![替代文字](/covers/desk.jpg)
![替代文字](/covers/desk.jpg "图注")
```

封面仍写在 front matter 的 `cover`。正文插图用上面这一行。点图会全屏放大，图集可左右翻。

## 代码

围栏开头写语言名：

````md
```js
const n = 1
```
````

围栏里的 Markdown 不会再解析。

## 表格

```md
| 列一 | 列二 |
| --- | --- |
| A | B |
| C | D |
```

表头下一行必须是 `| --- | --- |`。单元格里的 `|` 写成 `\|`。

## 提示块

两种都能用。GitHub Alert 更稳。

```md
> [!NOTE]
> 说明

> [!TIP]
> 建议

> [!IMPORTANT]
> 必看

> [!WARNING]
> 注意

> [!CAUTION]
> 危险
```

类型必须全大写，单独占一行。正文继续用 `>`。

容器写法：

```md
::: note
说明
:::

::: tip
建议
:::

::: important
必看
:::

::: warning
注意
:::

::: caution
危险
:::
```

容器别名：`info` → note，`success` → tip，`warn` → warning，`error` / `danger` → caution。

折叠：

```md
::: details{summary="点击展开"}
藏起来的内容
:::
```

`summary` 要用双引号。不写时标题是 `Details`。

## 公式

行内：

```md
爱因斯坦质能公式是 $E=mc^2$。
```

独立成块：

```md
$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$
```

行内公式里不要换行，也不要再套一层 `$`。

## 脚注

正文里写 `[^id]`，文末写定义：

```md
这句话需要出处。[^1]

[^1]: 出处写在这里。
```

`id` 用字母数字。多条定义各占一行，会收进同一段脚注区。

## 本站导入接得住的节点

| 节点 | Markdown |
| --- | --- |
| 标题 Heading | `#` `##` `###` |
| 引用 Quote | `> ` |
| 提示 Alert | `> [!NOTE]` 等 |
| 横幅 Banner | `::: note` 等 |
| 折叠 Details | `::: details{summary="..."}` |
| 分割线 HR | `---` |
| 图片 Image | `![alt](src "caption")` |
| 视频 Video | `<video src="..." />` |
| 代码 CodeBlock | ` ```lang ` |
| 多文件代码 | `<code-snippet>` |
| 图 Mermaid | ` ```mermaid ` |
| 链接卡 | `<link-card url="..." />` |
| 表格 Table | 管道表 |
| 待办 CheckList | `- [ ]` / `- [x]` |
| 行内公式 | `$...$` |
| 块公式 | `$$...$$` |
| 剧透 Spoiler | `\|\|...\|\|` |
| 脚注 | `[^id]` + `[^id]: ...` |
| 下划线 | `++...++` |
| 上标 / 下标 | `^...^` / `~...~` |
| 提及 Mention | `{platform@handle}` |
| 注音 Ruby | `<ruby>...<rt>...</rt></ruby>` |
| 注释 Comment | `<!--...-->` |
| 图集 Gallery | `<gallery>` |
| 分栏 Grid | `<grid>` |
| 投票 Poll | `<poll>` |
| 对话 Chat | `<chat>` |

## LiteXML 扩展节点

标签必须单独成行。不要和普通 Markdown 写在同一段里。

```xml
<video src="/clip.mp4" poster="/thumb.jpg" />

<link-card url="https://example.com" title="标题" description="简介" />

<code-snippet>
<file name="index.ts" lang="ts">export {}</file>
</code-snippet>

<gallery layout="grid">
<img src="/covers/desk.jpg" alt="桌面" />
<img src="/covers/night.jpg" alt="夜里" />
</gallery>

<grid cols="2" gap="16px">
<cell><p>左</p></cell>
<cell><p>右</p></cell>
</grid>

<poll mode="single">
<question>选一个</question>
<option>A</option>
<option>B</option>
</poll>

<chat variant="user-agent">
<participants>
<participant id="u1" kind="user" name="komichi" />
<participant id="a1" kind="agent" name="haklex" />
</participants>
<messages>
<message id="m1" participant="u1">正文能渲染这些节点吗？</message>
<message id="m2" participant="a1">能。Markdown 走 transformer，扩展节点用 LiteXML。</message>
</messages>
</chat>
```

完整标签表见 https://github.com/Innei/haklex/blob/main/packages/rich-editor/docs/markdown-flavor-litexml.md
