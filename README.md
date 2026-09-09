# komichi

个人站点：Vite + React 单页应用，内容全部用 Markdown 维护。

改文字只动 `content/`。改交互才动 `src/`。

## 文档

完整说明在 [`docs/`](docs/INDEX.md)：

| 文档 | 用途 |
| --- | --- |
| [部署](docs/DEPLOY.md) | 本地开发、打包、上线、预览域名 |
| [实现](docs/IMPLEMENTATION.md) | 技术栈、路由、haklex 正文、顶栏/dock、文稿/手记布局、目录、peek、主题季节、页脚 |
| [内容](docs/CONTENT.md) | 改 Markdown 的目录和模板 |

短版速查：[content/HOW_TO_WRITE.md](content/HOW_TO_WRITE.md)

友人帐改 `content/friends.md`，项目改 `content/projects.md`。各一份文件，`##` 分段。

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。改 `content/` 下的 Markdown 后保存，页面会自动刷新。

```bash
npm run build
npm run preview
```

产物在 `dist/`，纯静态站点，没有后端。上线时任意路径找不到文件都要回退到 `index.html`。细节见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 技术栈

Vite 7 · React 19 · React Router 7 · framer-motion · haklex · lucide-react

构建时用 `import.meta.glob` 把 `content/` 打进前端包。
