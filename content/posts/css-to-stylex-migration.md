---
title: "从纯 CSS 到 StyleX：AI 加持下的一万行 CSS 迁移实践"
date: "2026-08-30"
category: 技术
pinned: true
tags: [AI, CSS, StyleX]
summary: Linear 的迁移重新点燃了 StyleX 讨论。这是一次从单文件样式表搬出一万行的实践。
cover: /covers/stylex.jpg
---

## 为什么大家都在讨论 StyleX

最近这段日子，在 X 上面 Tailwind 和 StyleX 的话题讨论激烈。其引爆点是 Linear 正在从 styled-components 形式的 CSS-in-JS 动态注入方案，改成 StyleX 类似的 CSS-in-JS 编译式方案。其在 AI 的加持下，在过去几个月中完成了渐进式迁移，直到最近这段时间全面转向了 StyleX。其带来的巨大性能提升，引发了热烈的讨论。

在推特上，StyleX 又成为了一个讨论的热点。不少博主声称，把 Tailwind CSS 换成 StyleX 之后，不仅减少了 CSS 产物的体积，也由此带来了首屏加载性能的提升。

## 为什么我决定放弃 Tailwind

我曾经也是一个 Tailwind CSS 的热衷提倡者。在非 AI agentic coding 的时候，Tailwind CSS 的 DX 在我看来绝对是一流的：它有一套符合规范的 design token，加上原子 class 的编写方式，在定义 UI 的时候非常方便。

但带来的问题就是，一旦编写非常复杂的 UI 样式，它的 class name 就会写得越来越长，甚至达到四五行。有些样式如果无法使用内置的原子类去实现，类似任意值语法，那么不管是地基还是后续维护的可读性，都是很差的。再一个，当你编写到四五行 Tailwind 的原子类时，如果不加以分类，后续维护起来看着也是让人头皮发麻。

> 如今在 Agentic Coding 的时代下，过于长的原子类本身就不是一种很好的实践方式。

我在过去的一段时间内，使用 Vanilla Extract 来编写 CSS。这种回归本质的 CSS 属性定义方式，在可读性上面远比 Tailwind 来得高，而且它也有着 Type-Safe 的开发体验。局限在于样式必须写在单独的 `.css.ts` 文件里，也无法做到编译时的原子 CSS 去重。

## StyleX 的原子化编译

StyleX 会做原子属性级别的拆分与复用。例如相同的 `color: red` 最终只需要生成一次，再通过组合 class 来复用。

这也是 StyleX 和 Vanilla Extract 比较核心的差异之一：前者的编译目标天然偏向 Atomic CSS，会在属性粒度上去重和复用；后者更接近静态 CSS-in-TS。

你可能会疑问：按理来说，Tailwind CSS 的原子类设计在 AI 时代看来是以 token 为维度的样式组成，那么它在 AI 输出样式的时候可能会更加节省 token。在我看来，这样的结论是否定的。现在我们人均每日消耗的 token 只会越来越多，结构化的 CSS 在可扩展性上要优于原子类方案。

## 一万多行 CSS 的迁移实战

现在我也倾向于使用 StyleX 来开发后续的项目。在过去的一天中，我把一个原本完全使用 CSS 进行样式定义、文件超过一万多行的项目，完全迁移到了按组件维度划分的 StyleX 方案。

由于这个项目整个 App 只有这一个总的 CSS 样式表，所以所有的模块都在一个文件里面定义样式。在非 AI 时代，这往往需要耗费大量的精力去迁移和验证。有了 agents，工作变成提取、编译、核对的循环——前提是 design token 保持一致。

## 下次我会怎么做

1. 先冻结颜色和字体 token，再碰组件。
2. 先迁叶子组件，再迁布局。
3. 保留一份视觉清单，而不只看产物体积。
4. 让 agent 提出 diff，自己在浏览器里核对。

这次迁移不是为了抛弃 CSS，而是给人和 agent 都划清：一种样式，被允许成为什么。
