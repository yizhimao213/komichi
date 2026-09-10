# User Instruction Memory

This file records user instructions, preferences, and teachings for reference in future interactions.

## Format

### User Instruction Entry
User instruction entries should follow this format:

[User Instruction Summary]
- Date: [YYYY-MM-DD]
- Context: [Mentioned scenario or time]
- Instructions:
  - [Content of user teaching or instruction, described line by line]

### Project Knowledge Entry
Entries discovered by the Agent during task execution should follow this format:

[Project Knowledge Summary]
- Date: [YYYY-MM-DD]
- Context: Discovered by Agent while performing [specific task description]
- Category: [Operations & Deployment|Build Methods|Testing Methods|Troubleshooting & Debugging|Workflow & Collaboration|Environment Configuration]
- Instructions:
  - [Specific knowledge points, described line by line]

## Deduplication Strategy
- Before adding a new entry, check for similar or identical instructions.
- If a duplicate is found, skip the new entry or merge it with the existing one.
- When merging, update the context or date information.
- This helps avoid redundant entries and keeps the memory file tidy.

## Entries

[Yohaku/innei 对照与视觉约束]
- Date: 2026-09-10
- Context: 对照 https://innei.in/posts/experience/ai-coding-methodology-systematic-practice 复刻文稿页目录条和文末
- Instructions:
  - 站点无 Tailwind；Pastel 用 OKLCH token（`--accent` / `--n-*`），不抄 ixoxi 蓝
  - Yohaku/innei.in 对照不看 Shiro 源码
  - 用户说「上传」才 git commit + push；看效果先预览
  - 项目只留 komichi；友链只留本站 + `tc.ixoxi.tw`
  - 文稿不要「立即出来」：全局过渡 + 懒加载
  - Spotlight 用子节点 `.card-spot`；神殿柱/流星只挂首页；文稿/手记详情页另挂黄金比例线（PhiLayer）+ 更密流星（density 1.8 / 60vh），对照 ixoxi `/about/`，描边跟 `--accent`
  - 桌面 TOC portal 到 `document.body` + `fixed`；`is-focus` 时 ripple 淡出左移
  - 目录源扫 DOM 标题（挂载后再扫 `h2[id]` / `h3[id]`），不再只靠 `extractToc`；分组用最小 depth；当前可见节展开、收起延迟 300ms
  - 折叠不用 motion `height: auto`（会卡在 0），改 CSS `grid-template-rows: 0fr / 1fr`
  - 列表跟滚当前项，悬停目录栏时停掉
  - 文末对照 innei `copyright` footer：作者「四十小路」，许可 `creativecommons.org/.../deed.zh-hans`，签名打印隐藏，复制钮 `md+` 才显示

[预览、仓库与对照材料]
- Date: 2026-09-10
- Context: Discovered by Agent while performing TOC/文末复刻与上传
- Category: Operations & Deployment
- Instructions:
  - 仓库：https://github.com/yizhimao213/komichi ；`main` 已推到 `5864362`
  - 预览：Vite 5173，`https://5173-34d61f4d1597c174.monkeycode-ai.online` ；核文稿 `https://5173-34d61f4d1597c174.monkeycode-ai.online/posts/haklex`
  - innei chunk 在 `/tmp/opencode/innei-js/`：`TocTree` 扫 `$headings`；文末在 `1rimoz6trtozk.js`（`id:"copyright"`、`V.Signature`）
  - `HOLD_MS = 980`；haklex `@haklex/rich-compose` 0.39.1；标题 class `rich-heading-h2/h3` + `id`
  - GitHub Contents API 会 `403`；`<dynamic>` 仍缺可 import 的 https ESM 地址

[关键文件]
- Date: 2026-09-10
- Context: Discovered by Agent while performing TOC DOM 源与 ArticleEnd
- Category: Environment Configuration
- Instructions:
  - `src/components/Toc.jsx`：`readHeadings` / `groupToc` / `openIds` / CSS 折叠 / 跟滚
  - `src/styles.css`：`.toc-full-kids` grid 折叠、`.article-end` 文末
  - `src/pages/Article.jsx`：`ArticleEnd`、文稿页挂文末
  - `src/haklex/markdown.js`：`extractToc` 仍作垫层，跳过围栏
  - `content/posts/haklex.md`：文首三个 `###`（写法 / 源码 / 成品），用来核目录
  - `docs/IMPLEMENTATION.md`：目录 DOM 源 + 文末对照说明
  - `src/App.jsx`：holding loader；首页才挂 Parthenon/Meteor
  - `src/components/MeteorLayer.jsx`、`Parthenon.jsx`、`CardSpotlight.jsx`

[会话进度 2026-09-10]
- Date: 2026-09-10
- Context: 用户要求把上下文压缩存一份；本轮已按「上传」推送
- Instructions:
  - 已完成并推送：TOC DOM/CSS 折叠、haklex 文首 `###`、文末 `ArticleEnd`（引用卡 / `komichi` 签名 / 菱形分隔 / 回到分类 / 查看全部文稿）
  - 下一步：打开 haklex 文稿核文首 `###`、滑到「图」核折叠、滚到底核文末四块；对齐后再改
  - 仍空：`<dynamic>` 样例
