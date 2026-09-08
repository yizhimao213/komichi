# 部署文档

本地开发、打包、上线都从这里抄命令。

## 环境

- Node.js 20+
- npm（仓库已带 `package-lock.json`）

## 1. 安装依赖

```bash
cd 项目根目录
npm install
```

## 2. 本地开发

```bash
npm run dev
```

浏览器打开 `http://localhost:5173`。

改 `content/` 下的 Markdown 后保存，页面会自动刷新。

首页会跟着变：

- `content/posts/*.md` + `content/notes/*.md` 数量 → 「N 篇」
- 上述正文合计字数 → 「M 字」
- `content/site.md` 的 `since` → 「X 天」
- `content/site.md` 的 `lead` → 首页副标题
- `content/quotes/*.md` → 首页打字机名言，打完停 5 秒再换下一句
- `content/thinking/*.md` → 首页「碎念」
- `content/says/*.md` → 首页「一言」

## 3. 打包

```bash
npm run build
```

产物在 `dist/`。这是纯静态站点，没有后端。

## 4. 本地预览打包结果

```bash
npm run preview
```

同样走 `5173` 端口。刷新 `/posts`、`/notes`、`/friends` 等前端路由会回到 `index.html`。

## 5. 预览域名

`vite.config.js` 的 `server.allowedHosts` 和 `preview.allowedHosts` 已允许：

- `*.monkeycode-ai.online`
- `*.ixoxi.cn`

配置是前导点通配：`.monkeycode-ai.online`、`.ixoxi.cn`。

其他域名把对应 host 加进这两处后再重启 `npm run dev` 或 `npm run preview`。

## 6. 上线

把 `dist/` 整目录丢到任意静态托管：

- Nginx / Caddy
- GitHub Pages
- Cloudflare Pages
- Netlify / Vercel（静态站点即可）

必须做 SPA 回退：任意路径找不到文件时，返回 `index.html`。

Nginx 示例：

```nginx
server {
  listen 80;
  server_name example.com;
  root /var/www/komichi/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

Cloudflare Pages / Netlify：构建命令 `npm run build`，输出目录 `dist`。

Vercel：框架选 Vite，输出目录 `dist`。

## 7. 封面图

封面文件放 `public/covers/`。构建后会出现在站点根路径 `/covers/`。

Markdown 里这样写：

```md
cover: /covers/your-image.jpg
```

## 8. 常见问题

刷新 `/posts` 或 `/notes` 空白或 404：开发服务器没走当前 `vite.config.js`。停掉旧进程，再执行 `npm run dev`。

预览域名打不开：确认 host 已在 `allowedHosts` 里，然后重启开发服务器。改 `vite.config.js` 不会热更新这项配置。
