# Markdown 目录说明

改内容只动 `content/` 和封面图。不要改 `src/`，除非要改交互。

首页统计会自动变：

`N 篇 · M 字 · X 天`

`N` = 文稿文件数 + 手记文件数。`M` 是这些正文的字数（`siteWords`）。`X` 由 `content/site.md` 的建站日期算出。

首页副标题和打字机名言也来自 Markdown。

## 目录对照

```text
content/
  site.md                 建站日期、首页简介
  quotes/                 首页打字机名言，一个文件一句
  posts/                  文稿，一个文件一篇，网址 /posts/<文件名>
  notes/                  手记，一个文件一篇，网址 /notes/<nid>
  series/                 专栏简介，一个文件一个专栏，网址 /notes/series/<slug>
  thinking/               思考，一个文件一条，出现在 /thinking
  says/                   一言，一个文件一句，出现在 /says
  pages/
    about.md              关于我
    about-site.md         关于本站
  friends.md              友人帐，一段一位友人，出现在 /friends
  projects.md             项目，一段一个项目，出现在 /projects
  HOW_TO_WRITE.md         短版速查
public/covers/            封面图，Markdown 里写 /covers/文件名
```

| 你要改什么 | 改哪个文件 | 页面会变 |
| --- | --- | --- |
| 文稿 | `content/posts/*.md` | 首页统计、最近在写、文稿列表、时光、搜索 |
| 手记 | `content/notes/*.md` | 首页统计、最近在写、手记列表、专栏、时光、搜索 |
| 专栏 | `content/series/*.md` | `/notes/series`、专栏详情、导航浮层 |
| 思考 | `content/thinking/*.md` | `/thinking`，首页右栏「碎念」最新 4 条 |
| 一言 | `content/says/*.md` | `/says`，首页右栏「一言」最新 2 条 |
| 关于我 | `content/pages/about.md` | `/about` |
| 关于本站 | `content/pages/about-site.md` | `/about-site` |
| 建站天数 | `content/site.md` 的 `since` | 首页「X 天」 |
| 首页简介 | `content/site.md` 的 `lead` | 首页副标题 |
| 首页名言 | `content/quotes/*.md` | 首页打字机句子，打完停 5 秒再换 |
| 封面 | `public/covers/` + 文稿/手记的 `cover` 字段 | 对应文章头图 |
| 友人帐 | `content/friends.md` | `/friends` |
| 项目 | `content/projects.md` | `/projects` |

首页主标题「你好，我是 komichi…」写在 `src/pages/Home.jsx`。

## 通用规则

1. 文件必须是 `.md`
2. 文稿、手记、专栏、思考、一言、关于页：开头用 `---` 包住字段（front matter）
3. 字段下面空一行再写正文
4. 首页名言 `content/quotes/` 不需要 front matter，正文就是那句话
5. 友人帐、项目用 `##` 分段，不用 front matter，也不要再往 `content/friends/`、`content/projects/` 放单文件
6. 保存后开发服务器会刷新
7. 标题用 `##` 和 `###`，文稿/手记正文右侧才会出目录
8. 正文由 haklex 渲染（代码块、公式、图片等走编辑器节点），写法和普通 Markdown 一样

日期统一写成 `YYYY-MM-DD`，例如 `2026-09-07`。思考页也可以写成 `2026.09.07`。

## 建站天数和首页简介

文件：`content/site.md`

```md
---
since: "2020-09-01"
lead: "误入现世的工程师一只。白天画结界、排术式，夜里把想法炼成能自己走路的小世界。"
---
```

改 `since`，首页「X 天」会重算。改 `lead`，首页副标题会变。

## 首页打字机名言

目录：`content/quotes/`

一个文件一句。文件名按字母序循环，例如 `01.md`、`02.md`。

```md
梦想不会逃跑，逃跑的永远是自己。
```

不需要 front matter。正文就是那句话。

首页会打字机打出，停 5 秒，擦掉，再打下一句。加文件、改文件都会立刻反映到首页。

现有句子：`01.md` 到 `08.md`。再加就新建 `09.md`。

## 文稿

目录：`content/posts/`

文件名 = 网址。`hello-world.md` → `/posts/hello-world`

```md
---
title: "文章标题"
date: "2026-09-07"
category: 技术
tags: [AI, CSS]
summary: 一句话摘要，出现在文稿列表
cover: /covers/stylex.jpg
---

## 第一节

正文。
```

必填：`title`、`date`

选填：`category`、`tags`、`summary`、`cover`

封面图先放到 `public/covers/`，再把路径写成 `/covers/文件名`。

加一篇之后会自动出现在：

- 首页统计「N 篇」和字数
- 首页「近期笔墨」（按日期取最新 5 条）
- `/posts`
- `/categories` 与 `/categories/<slug>`（`技术` → `tech`，`折腾` → `tinkering`）
- `/posts/tag/<slug>`
- `/timeline`
- 搜索

## 手记

目录：`content/notes/`

建议文件名用编号：`220.md`

网址用 `nid`：`nid: 220` → `/notes/220`

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

## 小节

正文。
```

必填：`title`、`nid`、`date`

选填：`mood`、`series`、`summary`、`cover`

`nid` 不要和其他手记重复。

`series` 填专栏的 `name`。相同名字的手记会聚到 `/notes/series`，详情在 `/notes/series/<slug>`。

手记正文页还会用这个名字：左列专栏目录（宽屏 ≥1500px）、纸面飘带悬停卡、文末专栏卡。

## 专栏

目录：`content/series/`

一个文件一个专栏。文件名随意，网址用 `slug`。

```md
---
name: 深夜杂想
slug: 深夜杂想
letter: 深
subtitle: 灯灭之后才肯说出口的那些念头。
date: "2026-08-12"
color: "#6b4a3a"
---

城市把灯关掉，想法才肯露面。这里只收白天说不出口的心情。
```

必填：`name`

选填：`slug`、`letter`、`subtitle`、`date`、`color`

正文就是专栏详情页上的简介。手记 front matter 的 `series` 写成这里的 `name`，就会出现在这个专栏下面。

没有这份文件也可以：只要手记写了 `series`，列表里仍会出现同名专栏，只是没有副标题和简介。

改专栏：直接改这份 Markdown。新建专栏：再放一份 `.md`，然后给手记写上对应的 `series`。

加一篇之后会自动出现在：

- 首页统计「N 篇」和字数
- 首页「近期笔墨」
- `/notes`
- `/notes/series`（填写了 `series` 时）
- `/timeline`
- 搜索

## 思考

目录：`content/thinking/`

建议文件名用日期：`2026-09-07.md`

```md
---
date: "2026.09.07"
---

还没写成文章的一句。
```

正文就是卡片上的那句话。出现在 `/thinking`，按日期倒序。最新 4 条同时出现在首页「碎念」。

## 一言

目录：`content/says/`

文件名随意，建议递增：`007.md`

```md
---
date: 2024-04-02
author: 太宰治
source: 人间失格
---

要留下的那句话。
```

出现在 `/says`。卡片底栏左日期、右出处（优先 `source`）。最新 2 条同时出现在首页「一言」。

## 关于我 / 关于本站

- `content/pages/about.md` → `/about`
- `content/pages/about-site.md` → `/about-site`

```md
---
title: 关于我
kicker: 这是一份关于站长的报告
---

待补充
```

`title` 是大标题，`kicker` 是标题上方小字。下面整段就是页面正文，按 Markdown 渲染。

现在两份文件正文都是「待补充」，直接改这两份即可。

## 友人帐

文件：`content/friends.md`。一段一位友人，出现在 `/friends`。文件里的顺序就是页面顺序。

```md
## 站点名
url: https://example.com
avatar: /friends/example.jpg

一句介绍。
```

标题是卡片名，`url`（或 `href`）是外链，空行后是简介。
`avatar`（或 `icon`）是左侧头像，写 `/friends/文件名.jpg` 或完整网址。不写就显示名字首字。友人头像是圆形。图片放 `public/friends/`。

不要再新建 `content/friends/*.md`，构建只读这一份 `friends.md`。

## 项目

文件：`content/projects.md`。一段一个项目，出现在 `/projects`。文件里的顺序就是页面顺序。

```md
## 项目名
mark: 白
url: https://example.com
avatar: /projects/example.png

一句介绍。
```

`mark` 是左侧字标，不写就用名字第一个字。
`avatar`（或 `icon`）有值时用图片替换字标。图片放 `public/projects/`，或写完整网址。`url` 也可以写成 `href`。

不要再新建 `content/projects/*.md`，构建只读这一份 `projects.md`。

## 封面图

1. 把图片放到 `public/covers/`
2. 在文稿或手记 front matter 写 `cover: /covers/文件名.jpg`
3. 手记封面出现在列表卡和正文纸面淡洗（`.note-cover-wash`），不改顶栏颜色
4. 正文和卡片里的图默认懒加载并淡入；顶栏/首页头像是 `data-eager`，立刻显示

现成封面：

- `/covers/stylex.jpg`
- `/covers/glass.jpg`
- `/covers/desk.jpg`
- `/covers/night.jpg`
- `/covers/street.jpg`

## 检查清单

加文稿或手记后，打开首页看这三项是否变了：

1. 「N 篇」
2. 字数
3. 「近期笔墨」是否出现新标题

再打开对应列表页，确认新条目在最上面（按 `date` / `nid` 排序）。

改思考后看首页「碎念」。改一言后看首页「一言」。

改友人帐后打开 `/friends`。改项目后打开 `/projects`。顺序以文件里 `##` 段落为准。

改名言后，等当前句子打完一轮，确认新句子会出现。
