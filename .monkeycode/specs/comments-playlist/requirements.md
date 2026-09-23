# Requirements Document

## Introduction

文稿与手记接入可落库的评论，管理员在后台集中查看与删除；全站侧边弹窗播放器读取后台歌单。

## Glossary

- **评论**：挂在某一篇文稿或手记下的公开留言，写入 `comments` 表。
- **留言**：全站 `/message` 的痕迹，仍写入 `messages` 表。
- **歌单**：后台维护的曲目列表，前台侧边播放器按排序播放。
- **管理员**：持有 `ADMIN_TOKEN`、已通过 `/admin` 登录的操作者。

## Requirements

### Requirement 1：文稿评论

**User Story:** AS 读者, I want 在文稿和手记文末留下痕迹, so that 我的话会保存在这一篇下面。

#### Acceptance Criteria

1. WHEN 读者打开一篇文稿或手记, the 系统 SHALL 在文末展示评论框与已有评论列表。
2. WHEN 读者提交非空内容, the 系统 SHALL 将该评论写入 `comments`，并立即出现在该篇列表中。
3. IF 内容为空, the 系统 SHALL 提示先写一句，且不写入数据库。

### Requirement 2：后台管理评论

**User Story:** AS 管理员, I want 在后台查看并删除评论与全站留言, so that 我能清理不当内容。

#### Acceptance Criteria

1. WHEN 管理员打开 `/admin/comments`, the 系统 SHALL 列出文稿评论与全站留言两个分页。
2. WHEN 管理员删除一条记录, the 系统 SHALL 从数据库移除该记录，前台列表不再显示。
3. IF 未登录访问者请求 `/admin/comments`, the 系统 SHALL 展示登录页。

### Requirement 3：侧边播放器

**User Story:** AS 读者, I want 从侧边弹窗听音乐, so that 浏览站点时可以切换曲目。

#### Acceptance Criteria

1. WHEN 歌单中至少有一首曲目, the 前台 SHALL 在右下角展示播放器入口。
2. WHEN 读者打开弹窗, the 系统 SHALL 展示当前曲目、进度、音量和歌单列表。
3. WHEN 当前曲目播放结束, the 系统 SHALL 自动切到下一首。

### Requirement 4：后台歌单

**User Story:** AS 管理员, I want 在后台维护歌单, so that 播放器播放我指定的曲目。

#### Acceptance Criteria

1. WHEN 管理员打开 `/admin/playlist`, the 系统 SHALL 展示现有曲目与新增表单。
2. WHEN 管理员填写歌名与可用音频地址并提交, the 系统 SHALL 将该曲目加入歌单。
3. WHEN 管理员保存、排序或删除曲目, the 前台播放器 SHALL 在下次拉取歌单时反映该变更。
