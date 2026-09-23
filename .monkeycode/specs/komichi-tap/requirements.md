# Requirements Document

## Introduction

在站点提供独立全屏点按小游戏页 `/komichi`：点按、拖动、按键触发短促音与 Pastel 几何图案；循环底轨可开关。默认用系统合成占位音。管理员在后台维护独立音频槽（与歌单、侧边播放器分离），可替换或新增点按音与底轨。

## Glossary

- **Tap 页**：前台全屏小游戏，路径为 `/komichi`，不展示站点页头与页脚。
- **点按音**：短促音槽。读者点按、拖动或按下对应键时播放一次。系统内置 32 个默认槽。
- **底轨**：循环背景音乐槽。系统内置 11 个默认槽。同一时刻最多播放一条底轨。
- **占位音**：未绑定自定义音频时，系统现场合成的默认音色。
- **音频槽**：后台一条点按音或底轨记录。点按音槽编号为 0 到 31，底轨槽编号为 0 到 10。每槽含类型、编号、可选自定义音频地址与可选显示名。槽位数量固定，管理员只替换不追加。
- **自定义音频**：管理员为某一音频槽指定的站内文件路径或 http(s) 地址。
- **管理员**：持有 `ADMIN_TOKEN`、已通过 `/admin` 登录的操作者。
- **歌单**：后台 `/admin/playlist` 与前台侧边 `MusicPlayer` 使用的曲目列表。Tap 页不读取歌单。

## Requirements

### Requirement 1：全屏 Tap 页

**User Story:** AS 读者, I want 打开一个全屏点按页, so that 我可以立刻开始玩，不被站点导航打断。

#### Acceptance Criteria

1. WHEN 读者访问 `/komichi`, the 系统 SHALL 渲染全屏 Tap 页，且该页不包含站点页头、页脚与侧边播放器。
2. WHEN Tap 页已挂载, the 系统 SHALL 使用站点 Pastel 色板（`--accent` 与 `--n-*`）绘制背景与图案。
3. WHEN 读者从 Tap 页选择返回站点, the 系统 SHALL 导航到站点首页 `/`。
4. WHEN 读者打开站点任意带导航的页面, the 系统 SHALL 在主导航与页脚提供进入 `/komichi` 的入口。

### Requirement 2：开始、关于与底轨开关

**User Story:** AS 读者, I want 先看到开始层再进入游玩, so that 我知道怎么玩、能否关底轨。

#### Acceptance Criteria

1. WHEN 读者首次进入 Tap 页且尚未开始, the 系统 SHALL 展示开始层，层上提供「开始」「关于」「底轨开/关」三个操作。
2. WHEN 读者选择「开始」, the 系统 SHALL 收起开始层并进入可交互游玩状态。
3. WHEN 读者选择「关于」, the 系统 SHALL 展示说明层，说明点按、拖动、按键出声，并标明占位音为合成音色、自定义音频由站长配置。
4. WHEN 读者切换底轨开关为开, the 系统 SHALL 从已就绪的底轨中选一条循环播放。
5. WHEN 读者切换底轨开关为关, the 系统 SHALL 停止当前底轨。

### Requirement 3：点按、拖动与按键出声出图

**User Story:** AS 读者, I want 点按、拖动、按键盘时听到声音并看到图案, so that 交互有即时反馈。

#### Acceptance Criteria

1. WHEN 游玩状态下读者在画布上按下指针, the 系统 SHALL 按指针位置映射到一个点按音槽，播放该槽音频一次，并在落点附近绘制一组 Pastel 几何图案。
2. WHEN 游玩状态下读者在画布上拖动指针跨过新的映射区域, the 系统 SHALL 为每个新区域播放对应点按音一次并绘制图案。
3. WHEN 游玩状态下读者按下字母键 A 到 Z, the 系统 SHALL 播放点按音槽 0 到 25 中对应槽一次并绘制图案。
4. WHEN 游玩状态下读者按下 `[` `]` `;` `'` `,` `.` 六键之一, the 系统 SHALL 依次播放点按音槽 26 到 31 中对应槽一次并绘制图案。
5. IF 读者输入设备声明 `prefers-reduced-motion: reduce`, the 系统 SHALL 使用静止或单帧图案，并仍播放对应音频。

### Requirement 4：默认槽位与占位音

**User Story:** AS 读者, I want 即使站长还没上传音频也能出声, so that 打开页面就能玩。

#### Acceptance Criteria

1. WHEN Tap 页进入游玩状态, the 系统 SHALL 提供 32 个点按音槽与 11 个底轨槽。
2. IF 某一音频槽没有可用的自定义音频, the 系统 SHALL 为该槽播放对应的合成占位音。
3. WHEN 系统生成点按占位音, each 槽 SHALL 使用彼此可分辨的音高或音色，时长在 80 毫秒到 400 毫秒之间。
4. WHEN 系统生成底轨占位音, each 槽 SHALL 使用可循环的合成音色，且 11 条底轨彼此可分辨。

### Requirement 5：自定义音频优先生效

**User Story:** AS 读者, I want 听到站长换过的音频, so that 小游戏是这个站点自己的声音。

#### Acceptance Criteria

1. WHEN 某一音频槽绑定了可请求的自定义音频, the 系统 SHALL 在触发该槽时播放该自定义音频，不再播放该槽的占位音。
2. IF 自定义音频请求失败或解码失败, the 系统 SHALL 回退到该槽的占位音，并保持游玩可继续。
3. WHEN 管理员保存音频槽变更后读者重新打开 Tap 页, the 系统 SHALL 使用最新槽位配置。

### Requirement 6：后台独立音频槽

**User Story:** AS 管理员, I want 在后台增改点按音和底轨, so that 我能换成自己的声音。

#### Acceptance Criteria

1. WHEN 管理员打开 `/admin/tap`, the 系统 SHALL 分别列出 32 个点按音槽与 11 个底轨槽。
2. WHEN 管理员为某一槽填写可用音频地址并保存, the 系统 SHALL 将该地址绑定到该槽。
3. WHEN 管理员清空某一槽的自定义音频并保存, the 系统 SHALL 使该槽在前台回退为占位音。
4. IF 未登录访问者请求 `/admin/tap`, the 系统 SHALL 展示登录页。
5. WHEN 管理员在 `/admin/tap` 保存音频槽, the 系统 SHALL 将变更写入独立于 `tracks` 表的存储，且侧边歌单播放器保持原有曲目不变。
6. WHILE 后台展示 Tap 音频槽, the 系统 SHALL 仅允许替换这 43 个槽的地址与显示名，页面不提供追加槽位的入口。

### Requirement 7：音频地址约束

**User Story:** AS 管理员, I want 用站内文件或外链音频填槽, so that 我能复用文件库里的 mp3。

#### Acceptance Criteria

1. WHEN 管理员提交音频地址, the 系统 SHALL 仅接受以 `/` 开头的站内路径或以 `http://`、`https://` 开头的地址。
2. IF 管理员提交的地址格式不符合上述约束, the 系统 SHALL 拒绝保存并提示地址不可用。
3. WHEN 后台展示槽位表单, the 系统 SHALL 提供从文件库已有 `audio/*` 文件中选择地址的方式。
