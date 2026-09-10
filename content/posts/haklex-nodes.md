---
title: "haklex 节点效果"
date: "2026-09-09"
category: 技术
tags: [haklex, Markdown]
summary: 对照官方 /nodes 的正文节点，写进 content/ 就能看见同样的渲染。
cover: /covers/haklex-nodes.webp
---

对照官方 [haklex /nodes](https://haklex.innei.dev/nodes)。写法见 `docs/HAKLEX.md`。

## 行内

这句里有 **重点**、*语气*、~~划掉~~、++下划线++、||剧透||、`行内代码`。

爱因斯坦方程是 $E=mc^2$。水是 H~2~O。面积是 πr^2^。

日文注音：<ruby>漢字<rt>かんじ</rt></ruby> 与 <ruby>東京<rt>とうきょう</rt></ruby>。

看 {github@innei} 和 [小路]{github@komichi}。这句话带脚注。[^1]

[^1]: 脚注会收在文末。

## 图片与视频

![山景](https://picsum.photos/1200/720?random=301 "一张带图注的图")

<video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" poster="https://picsum.photos/1280/720?random=302" width="1280" height="720" />

## 代码

```ts
type User = {
  id: string
  name: string
}

function hello(name: string) {
  return `Hello, ${name}`
}
```

<code-snippet>
<file name="index.ts" lang="ts">export function hello(name: string): string {
  return `Hello, ${name}!`
}</file>
<file name="usage.ts" lang="ts">import { hello } from './index'
console.log(hello('World'))</file>
</code-snippet>

## 图

```mermaid
graph TD
    A["开始"] --> B["判断"]
    B --> C["完成"]
```

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

<link-card url="https://github.com/Innei/haklex" title="Innei/haklex" description="Lexical 富文本编辑器" favicon="https://github.githubassets.com/favicons/favicon.svg" />

## 表格与待办

| 功能 | 状态 |
| --- | --- |
| Alert | 可用 |
| Mermaid | 可用 |
| 投票 | 可点 |

- [x] 已完成
- [ ] 待办

## 提示

> [!NOTE]
> 说明信息。

> [!TIP]
> 建议写法。

> [!IMPORTANT]
> 必看。

> [!WARNING]
> 注意。

> [!CAUTION]
> 危险操作。

::: note
横幅说明。
:::

::: tip
横幅建议。
:::

::: warning
横幅注意。
:::

::: caution
横幅危险。
:::

::: details{summary="点击展开"}
折叠起来的补充说明。
:::

## 图集与分栏

<gallery layout="grid">
<img src="https://picsum.photos/400/300?random=1" alt="图一" />
<img src="https://picsum.photos/400/300?random=2" alt="图二" />
<img src="https://picsum.photos/400/300?random=3" alt="图三" />
<img src="https://picsum.photos/400/300?random=4" alt="图四" />
</gallery>

<gallery layout="carousel">
<img src="https://picsum.photos/800/400?random=5" alt="幻灯一" />
<img src="https://picsum.photos/800/400?random=6" alt="幻灯二" />
<img src="https://picsum.photos/800/400?random=7" alt="幻灯三" />
</gallery>

<grid cols="2" gap="16px">
<cell><p>左栏</p></cell>
<cell><p>右栏</p></cell>
</grid>

## 投票与对话

<poll mode="single">
<question>更想看哪一类节点？</question>
<option>行内</option>
<option>块</option>
<option>容器</option>
</poll>

<chat variant="user-agent">
<participants>
<participant id="u1" kind="user" name="komichi" />
<participant id="a1" kind="agent" name="haklex" />
</participants>
<messages>
<message id="m1" participant="u1">正文能渲染 /nodes 那些节点吗？</message>
<message id="m2" participant="a1">能。Markdown 走 transformer，扩展节点用 LiteXML。</message>
</messages>
</chat>
