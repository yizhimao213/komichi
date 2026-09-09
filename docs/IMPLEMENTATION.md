# 项目实现文档

这是 komichi 个人站点的实现说明。内容用 Markdown 维护，页面是 Vite + React 的单页应用。

## 技术栈

- Vite 7
- React 19
- React Router 7
- framer-motion ^13
- `@haklex/rich-compose` / `@haklex/rich-editor` / `@haklex/rich-editor-ui` / `@haklex/rich-litexml` 0.39.1
- Lexical 0.49
- lucide-react

纯静态站点。构建时用 `import.meta.glob` 把 `content/` 下的 Markdown 打进前端包。正文经 haklex 转成 Lexical JSON 再静态渲染。

## 目录

```text
src/
  main.jsx              入口，BrowserRouter，启动图片懒加载
  App.jsx               壳：顶栏、路由过渡、页脚、搜索、主题/季节
  content.js            读 Markdown，导出 posts / notes / series / friends / projects / pages / thoughts / says / quotes
  haklex/               正文渲染与留言编辑器封装
    HaklexContent.jsx   只读渲染：Markdown → Lexical → composeRenderer
    HaklexEditor.jsx    留言编辑器：composeEditor，默认 variant=comment
    markdown.js         markdownToLexical、extractToc
    transformers.js     图片 / mermaid 导入
    poll.js             投票只读适配
    theme.js            跟随 html[data-theme]
  lazyImages.js         全站图片懒加载
  peek.js               时光页 peek 路径解析
  context.jsx           顶栏 meta、季节、目录 sheet 开关
  styles.css            全局样式
  pages/                页面（Editor.jsx 是空 stub，没有路由）
  components/           Header、Toc、PeekModal、DeckleFilter、Background、TypewriterQuote、PageLoader、*Mega
content/                可编辑内容，见 docs/CONTENT.md
public/                 头像、封面、图标
vite.config.js          开发服务器、SPA 回退、allowedHosts
docs/                   DEPLOY / IMPLEMENTATION / CONTENT
```

仓库根目录只有 `index.html` 作为 SPA 入口。没有独立的 `posts.html`、`notes.html` 等静态页。

## 路由

| 路径 | 页面 | 数据来源 |
| --- | --- | --- |
| `/` | 首页 | posts、notes、thoughts、says、siteDays、siteWords、siteLead、quotes |
| `/posts` | 文稿列表 | `content/posts/*.md` |
| `/posts/:slug` | 文稿正文 | 文件名即 slug |
| `/categories` | 分类列表 | 文稿 `category` 聚合 |
| `/categories/:slug` | 分类详情 | 按年分组 + 本分类标签 |
| `/posts/tag/:slug` | 标签详情 | 文稿 `tags` 聚合 |
| `/notes` | 手记列表 | `content/notes/*.md` |
| `/notes/series` | 专栏列表 | `content/series/*.md` + 手记 `series` 聚合 |
| `/notes/series/:slug` | 专栏详情 | 专栏 Markdown + 同名手下的手记，按年列出 |
| `/notes/:nid` | 手记正文 | front matter 的 `nid` |
| `/thinking` | 思考 | `content/thinking/*.md` |
| `/says` | 一言 | `content/says/*.md` |
| `/about` | 关于我 | `content/pages/about.md` |
| `/about-site` | 关于本站 | `content/pages/about-site.md` |
| `/timeline` | 时光 | 文稿 + 手记按日期合并 |
| `/friends` | 友人帐 | `content/friends.md` |
| `/projects` | 项目 | `content/projects.md` |
| `/message` | 留言 | `HaklexEditor` 评论框，无 slash / playground |

站点用 npm 上的 `@haklex/*`，官方 demo 单独跑。

`vite.config.js` 的 `spaHtmlGuard` 会把上表路径改写到 `index.html`。

开发与预览允许的 host：`.monkeycode-ai.online`、`.ixoxi.cn`。

## 内容加载

`src/content.js` 在构建时扫描：

- `content/posts/*.md`
- `content/notes/*.md`
- `content/series/*.md`
- `content/pages/*.md`
- `content/thinking/*.md`
- `content/says/*.md`
- `content/quotes/*.md`
- `content/friends.md`
- `content/projects.md`
- `content/site.md`

文稿、手记、专栏、思考、一言、关于页用 YAML front matter + 正文。

友人帐和项目用 `parseCatalog`：按 `## 名称` 分段，段内 `key: value` 是字段，空行后是简介。文件里的顺序就是页面顺序。不扫描 `content/friends/`、`content/projects/` 目录。

新增或改 `.md` 后保存，开发服务器会热更新。

首页（`src/pages/Home.jsx`）：

- 主标题文案写在组件里
- 副标题 = `content/site.md` 的 `lead`
- 统计行 = `文稿数 + 手记数` 篇 · `siteWords`（正文汉字/拉丁词计数）· `siteDays`（今天减去 `since`）
- 打字机名言 = `content/quotes/*.md`，由 `TypewriterQuote` 打出，停 5 秒，擦掉，再打下一句
- 左栏「近期笔墨」按 `date` 取文稿和手记最新 5 条（文稿显示「文章」，手记显示「笔记」）
- 右栏「碎念」= `content/thinking/*.md` 最新 4 条，链到 `/thinking`
- 右栏「一言」= `content/says/*.md` 最新 2 条，链到 `/says`
- 「笔耕不辍」= 近 1 年文稿+手记时间轴，悬停标题出现在轨道上方
- 宽屏 `.home-split` 双栏；`max-width: 1100px` 改成一列
- 社交只留 B站和 RSS
- 首页头像 `data-eager`，不走懒加载淡入

## 打字机

`src/components/TypewriterQuote.jsx`：

- 默认 `holdMs = 5000`
- 打字间隔约 48ms，回删约 22ms
- 句子按文件名排序循环
- 光标样式在 `.quote-type .caret`

## 页面切换

`App.jsx` 用 `AnimatePresence` + `motion.div` 做淡入上移，时长 0.62s。`/message` 不走 `y` transform，避免留言框被父级位移带偏。链接带 `viewTransition`。顶栏 `view-transition-name: none`，不参与页面切换动画。

文稿/手记正文进入时闪一次预加载：中心点 + 两圈描边 + 光晕，文案「稍候片刻，四十小路出没。」首页、列表页直接进。实现：`src/components/PageLoader.jsx`，`App.jsx` 对 `/posts/:slug`、`/notes/:nid` 先 hold 约 980ms。`/notes/series` 不算正文，不 hold。

主题、季节切换走 `document.startViewTransition`，type 为 `look`。

## 顶栏与窄屏底栏

实现都在 `src/components/Header.jsx`。断点：`max-width: 1100px` 走底栏 dock，大于该宽度走桌面顶栏。

桌面顶栏：

- 五项：首页 / 文稿 / 手记 / 时光 / 思考
- 激活滑块量 `left` / `width`，弹簧 `stiffness 380 / damping 36`；未激活图标宽度收到 0，不占空槽
- 下滑累计位移超过 12px：顶栏 `translateY(-100%)` 藏起；上滑超过 12px：滑回。过渡 `0.48s cubic-bezier(0.22, 1, 0.36, 1)`
- `y < 24` 时强制显示
- 正文页当前把 `hasCover` 固定为 `false`，顶栏不再因封面变白字透明

窄屏底栏（`.dock-shell`）：

- 空闲：居中胶囊，宽度约视口 70%，条高约 40px，圆角 20
- 下滑：收到 44px 圆球（`.dock-orb`）；停 1.5s 再展开
- 打开：左右几乎贴边（左右各留 12px），高度用弹簧向上长开，圆角仍是 20
- 弹簧 `stiffness 360 / damping 34 / mass 0.72`
- 菜单项：首页、文稿、手记、时光、思考；「更多」一行：友人帐、项目、一言、关于我
- 打开菜单时锁 `html/body overflow: hidden`，并用 `body position: fixed` 冻滚动位置；关掉恢复
- 打开目录 sheet 只藏 dock
- 打开菜单时强制显示
- 没有「回到顶部」悬浮钮

## haklex 正文

站点用 npm 包接入 haklex。

封装在 `src/haklex/`：

| 文件 | 作用 |
| --- | --- |
| `HaklexContent.jsx` | `composeRenderer({ modules: allRendererModules })`，class 为 `haklex-body` |
| `HaklexEditor.jsx` | `composeEditor({ modules: allEditorModules })`，留言默认 `variant="comment"`，`slash` 默认关 |
| `markdown.js` | 分段 MD / LiteXML；Alert / Banner / Details / 块公式先抬成节点，再走 transformer；脚注用静态 `FootnoteSectionNode` |
| `transformers.js` | `![alt](src)`、` ```mermaid ` 导入 |
| `poll.js` | 只读页 `PollDataProvider` 适配 |
| `theme.js` | `MutationObserver` 读 `document.documentElement.dataset.theme` |

接入点：

- 文稿：`HaklexContent` `variant="article"`
- 手记、peek 手记：`variant="note"`
- 关于我 / 关于本站：`variant="article"`
- 留言：`HaklexEditor`，`slash` 默认 false，slash 插件走稳定 children

haklex 默认内容宽 `--rc-max-width: 700px`。站点在 `.article-page` / `.note-paper` / `.peek-paper` 的 `.haklex-body` 上覆盖为 `none`，铺满 900px 栏。目录锚点对着 `.rich-content` 里的标题 id。

官方 [Innei/haklex](https://github.com/Innei/haklex) 是独立 pnpm monorepo（demo 端口 5188）。改 haklex 源码用 `pnpm link`。

## 文稿页

`Article.jsx` 把 `doc.body` 交给 `HaklexContent`。`##` / `###` 由 `extractToc` 抽成目录。

布局 `.article-layout`：`minmax(0, 900px) 200px`，总宽 `min(1144px, calc(100% - 48px))`。页头 `.article-head`，摘要进「关键洞察」。封面图不铺满屏。

## 手记页

手记走纸面布局，和文稿页分开。

- `.note-stage`：默认正文 900px + 右侧目录 200px；`min-width: 1500px` 时变成 `200px minmax(0, 900px) 200px`，总宽 `min(1388px, calc(100% - 48px))`
- 左列 `NoteSeriesRail`：近期手记、当前篇「」高亮、专栏折叠、「查看全部 N 篇 →」。窄于 1500px 和打印时隐藏，避免叠到标题上
- 纸面 `.note-paper` + `.ni-deckle` 毛边（`DeckleFilter` 的 SVG `#deckle-edge`）
- 飘带 `SeriesRibbon`：悬停只弹专栏卡（简介、最近更新、共有手记），不打开左侧目录
- 标题行右上 `NoteFontSwitch`，键 `yohaku-note-font`：`serif`（宋体）/ `sans`（书写文稿）
- 有 `cover` 时用 `.note-cover-wash` 淡洗，不改顶栏
- 文末 `NoteSeriesEnd` 专栏卡

## 目录

右侧 `Toc.jsx`，portal 到 `fixed; top: 96px`：

- 未滚动：完整目录列表
- 阅读中：SVG 凸起轨道，跟随当前标题；目录条本身不动
- 空闲微呼吸/波浪，移动时轻微跟随
- 悬停轨道：展开完整列表
- 滚到底或进度 100%（`atEnd`）：收回成「目录」列表；再往上滚变回阅读条
- `max-width: 1100px`：右下角目录钮 + 底部目录 sheet；打开时 dock 加 `is-toc-hidden`，不锁 `body position: fixed`
- 窄屏停掉桌面轨的 `requestAnimationFrame` 绘制，也不再量 `listH` 做高度弹簧
- sheet 只动 `transform: translateY` 和 `opacity`；尺寸用 CSS `left/right: 12px` + `max-height: min(70vh, calc(100dvh - 96px))`
- 关掉时去掉 `backdrop-filter`，避免透明层继续模糊

## 时光 peek

`/timeline` 在 `min-width: 1101px` 点击条目打开 `PeekModal`，查询参数 `?peek-to=`。窄屏直接进正文。手机首页锁横向滑动。

## 图片懒加载

`src/lazyImages.js` 的 `watchLazyImages` 在 `main.jsx` 启动，MutationObserver 给新 `img` 绑淡入。无 `data-eager` 的图加 `is-lazy`，加载完加 `is-in`。顶栏、首页、mega 头像 `data-eager`。

## 主题、季节与背景

页脚和移动端抽屉直接切换，没有弹层。

- `localStorage` 键 `yohaku-theme`：`light` / `dark`
- `localStorage` 键 `yohaku-bg`：背景粒子开/关
- `localStorage` 键 `yohaku-season`：`spring` / `summer` / `autumn` / `winter`，默认 `autumn`
- `html[data-theme]`、`html[data-season]` 驱动 CSS 变量
- `#bg-canvas.is-on` 控制粒子淡入淡出
- 深色 `--paper` 接近同灰；首页光晕只在头像上

## 页脚与品牌

- 站名：komichi
- 版权：四十小路 & 四季折 / komichi
- 联系：B站 `https://space.bilibili.com/1512246445`
- 关于：关于本站、关于我
- 更多：一言、写留言
- 已去掉 GitHub、X、发邮件、关于此项目、照片廊

## 关键文件

- 路由与页脚：`src/App.jsx`
- 顶栏 / dock：`src/components/Header.jsx`
- 内容总线：`src/content.js`
- 分类与标签：`src/pages/Categories.jsx`、`src/pages/Category.jsx`、`src/pages/Tag.jsx`
- 首页打字机与年线：`src/pages/Home.jsx`、`src/components/TypewriterQuote.jsx`
- 文章、手记、专栏飘带/左栏：`src/pages/Article.jsx`
- 目录：`src/components/Toc.jsx`
- haklex：`src/haklex/HaklexContent.jsx`、`src/haklex/HaklexEditor.jsx`、`src/haklex/markdown.js`、`src/haklex/transformers.js`、`src/haklex/poll.js`
- 节点样例：`content/posts/haklex-nodes.md`
- 留言：`src/pages/Message.jsx`
- 时光 peek：`src/pages/Timeline.jsx`、`src/components/PeekModal.jsx`、`src/peek.js`
- 懒加载：`src/lazyImages.js`
- 毛边滤镜：`src/components/DeckleFilter.jsx`
- 开发回退与域名：`vite.config.js`
