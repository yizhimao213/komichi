# 怎么改内容

完整说明在 `docs/CONTENT.md`。正文节点写法在 `docs/HAKLEX.md`。这里只留最短步骤。

首页「N 篇 · M 字 · X 天」会跟着 Markdown 数量、正文词数和 `content/site.md` 自动变。
思考出现在 `/thinking` 和首页「碎念」。一言出现在 `/says` 和首页「一言」。

首页简介改 `content/site.md` 的 `lead`。
首页打字机名言放 `content/quotes/`，一个文件一句，每 5 秒换一句。

## 文稿

放到 `content/posts/hello-world.md`，网址 `/posts/hello-world`

```md
---
title: "文章标题"
date: "2026-09-07"
category: 技术
tags: [AI]
summary: 一句话摘要
cover: /covers/stylex.jpg
---

## 第一节

正文。
```

## 手记

放到 `content/notes/220.md`，网址 `/notes/220`。
手记的 `series` 要写成专栏的 `name`。

## 专栏

放到 `content/series/ye-shen-za-xiang.md`，网址 `/notes/series/<slug>`。
改这份文件就能改专栏名字、简介、字母标。不写这份也可以，手记里填了 `series` 仍会自动聚成专栏。

```md
---
name: 深夜杂想
slug: 深夜杂想
letter: 深
subtitle: 灯灭之后才肯说出口的那些念头。
date: "2026-08-12"
---

城市把灯关掉，想法才肯露面。这里只收白天说不出口的心情。
```

```md
---
title: "手记标题"
nid: 220
date: "2026-09-07"
mood: 开心
series: 深夜杂想
summary: 一句话摘要
cover: /covers/night.jpg
---

正文。
```

## 友人帐 / 项目

友人帐改 `content/friends.md`，出现在 `/friends`。一段一个站点，文件里的顺序就是页面顺序。

```md
## 站点名
url: https://example.com
avatar: /friends/example.jpg

一句介绍。
```

项目改 `content/projects.md`，出现在 `/projects`。

```md
## 项目名
mark: 白
url: https://example.com
avatar: /projects/example.png

一句介绍。
```

头像图放 `public/friends/` 或 `public/projects/`，字段写成 `/friends/文件名.jpg`。也可以写完整 http(s) 地址。不写 `avatar` 就显示字标。

## 思考 / 一言 / 关于 / 名言

- 思考：`content/thinking/2026-09-07.md`
- 一言：`content/says/007.md`，字段 `date` / `author` / `source`
- 关于我：`content/pages/about.md`
- 关于本站：`content/pages/about-site.md`
- 建站日期：`content/site.md` 的 `since`
- 首页简介：`content/site.md` 的 `lead`
- 首页名言：`content/quotes/09.md`，正文写一句即可
- 友人帐：`content/friends.md`
- 项目：`content/projects.md`

封面图放 `public/covers/`，字段写成 `/covers/文件名.jpg`。
