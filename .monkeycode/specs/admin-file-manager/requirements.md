# Requirements Document

## Introduction

在 komichi 后台增加文件库，用来存放图片、文档和其他附件。管理员可上传、浏览、复制链接、删除；正文编辑器插入图片/文件时写入同一文件库，公开站点通过稳定 URL 读取。

## Glossary

- **文件库**：后台 `/admin/files` 页面，以及对应的 Worker + 对象存储。
- **对象**：一条已上传的文件记录，含元数据（名称、类型、大小、时间）和可访问 URL。
- **公开 URL**：形如 `/files/{id}/{filename}` 的地址，前台文稿、封面、友链头像等可直接引用。
- **管理员**：持有 `ADMIN_TOKEN`、已通过 `/admin` 登录的操作者。
- **正文编辑器**：后台文稿/手记等使用的 `HaklexEditor`。

## Requirements

### Requirement 1：后台入口

**User Story:** AS 管理员, I want 在侧栏打开文件库, so that 我能集中管理站点附件。

#### Acceptance Criteria

1. WHEN 管理员打开 `/admin/files`, the 系统 SHALL 展示文件库页面。
2. WHILE 管理员已登录, the 侧栏 SHALL 在「总览」下方提供「文件库」入口。
3. IF 未登录访问者请求 `/admin/files`, the 系统 SHALL 展示登录页。

### Requirement 2：上传

**User Story:** AS 管理员, I want 把本地图片、文档和其他文件上传到文件库, so that 站点可以引用这些对象。

#### Acceptance Criteria

1. WHEN 管理员在文件库选择一个或多个本地文件并确认, the 系统 SHALL 将每个文件写入对象存储，并在 D1 记录名称、MIME、大小、创建时间。
2. WHEN 单次上传完成, the 系统 SHALL 返回该对象的公开 URL 与管理元数据。
3. IF 文件超过大小上限, the 系统 SHALL 拒绝该文件并提示原因。
4. IF 文件类型不在允许列表内, the 系统 SHALL 拒绝该文件并提示原因。

默认上限与类型（待确认后写入实现）：

- 图片：`image/jpeg` `image/png` `image/gif` `image/webp` `image/svg+xml`，单文件 8 MiB
- 文档：`application/pdf` `text/plain` `text/markdown`，单文件 16 MiB
- 其他：`audio/mpeg` `video/mp4` `application/zip`，单文件 32 MiB

### Requirement 3：浏览与检索

**User Story:** AS 管理员, I want 按类型筛选并搜索文件, so that 我能找到要插入的附件。

#### Acceptance Criteria

1. WHEN 文件库打开, the 系统 SHALL 按创建时间倒序列出对象，展示缩略图（图片）或类型图标、文件名、大小、时间。
2. WHEN 管理员选择类型筛选（全部 / 图片 / 文档 / 其他）, the 列表 SHALL 只显示对应对象。
3. WHEN 管理员输入关键字, the 列表 SHALL 按文件名包含匹配过滤。
4. WHILE 列表为空, the 页面 SHALL 显示空状态说明。

### Requirement 4：复制链接与删除

**User Story:** AS 管理员, I want 复制公开 URL 或删除对象, so that 我能在封面、正文或其他字段使用这些文件，并清理不用的对象。

#### Acceptance Criteria

1. WHEN 管理员点击「复制链接」, the 系统 SHALL 把该对象的公开 URL 写入剪贴板。
2. WHEN 管理员确认删除, the 系统 SHALL 同时删除对象存储中的内容和 D1 元数据。
3. IF 删除失败, the 系统 SHALL 保留原对象并提示失败原因。

### Requirement 5：正文编辑器接入

**User Story:** AS 管理员, I want 在文稿正文里插入图片或文件时写入文件库, so that 正文不再内嵌 data URL。

#### Acceptance Criteria

1. WHEN 管理员在正文编辑器上传图片、文件或视频, the 系统 SHALL 把该文件写入文件库，并把返回的公开 URL 作为编辑器 `src`。
2. WHILE 上传进行中, the 编辑器 SHALL 显示进度。
3. IF 上传失败, the 编辑器 SHALL 提示失败，并保持当前正文不变。

### Requirement 6：公开读取

**User Story:** AS 站点访客, I want 通过稳定 URL 打开已上传对象, so that 文稿里的图片和附件能正常显示。

#### Acceptance Criteria

1. WHEN 访客请求有效的公开 URL, the 系统 SHALL 返回该对象的原始字节，并带上对应 `content-type` 与缓存头。
2. IF 对象不存在, the 系统 SHALL 返回 404。
3. WHILE 对象存在, the 公开 URL 路径 SHALL 保持稳定（以对象 id 为键）。

### Requirement 7：鉴权

**User Story:** AS 站点维护者, I want 只有管理员能写入文件库, so that 访客无法往存储里塞文件。

#### Acceptance Criteria

1. WHEN 未持有有效 `ADMIN_TOKEN` 的请求访问上传、列表或删除接口, the 系统 SHALL 返回 401。
2. WHILE 公开读取接口处理 GET, the 系统 SHALL 不要求管理员口令。
