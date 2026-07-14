# Project Progress

Last updated: 2026-07-13

当前状态：production MVP 已上线，核心点歌、播放、实时同步、搜索缓存和房间清理流程均已实现。

## 已完成

### 产品流程

- 创建房间、大屏、手机点歌和 debug 四个页面已完成。
- 大屏二维码和手机链接指向同一房间；手机搜索、点歌和歌单更新无需刷新即可同步。
- 第一首歌自动成为当前播放，后续歌曲按队列顺序续播。
- 本地 Vite 模式保留 localStorage / BroadcastChannel fallback，方便 UI 开发。

### 手机端体验

- 支持歌名/歌手搜索、`带原唱`、默认推荐和缓存内继续加载。
- 搜索工具条 sticky；query、选项、结果、选中项、预览、可见数量、scroll 和当前 tab 可恢复。
- 同一时间只加载一个 480p YouTube preview；点击卡片直接选中并预览，点击结果区域外停止。
- `已选中` / `已在歌单` 使用 overlay tag；点歌后保留搜索上下文，并显示 toast 和飞入歌单动画。
- 歌单支持直接置顶、删除确认，以及带确认的重唱和切歌。
- 首页、移动端布局和控件已完成多轮 internal-test polish。

### 搜索与 quota

- YouTube Data API 由 Worker 代理，API key 不暴露给前端。
- KV 缓存按 search family 区分歌名/歌手和原唱意图；重复搜索可复用缓存。
- 每次冷缓存默认最多一次 `search.list`，最多保存 50 条候选；UI 最多使用 40 条并分批显示。
- 排序覆盖精确/部分歌名、歌手、KTV/karaoke、伴奏、歌词/MV 和原唱信号，并降低无关、cover、reaction、shorts 等结果。
- 空查询使用缓存推荐，不消耗搜索 quota。
- Quota 后台估算、Pacific Time 重置、状态 API 和大屏本地时区展示已完成。
- 搜索限流已完成。

### 播放与实时状态

- Production 房间状态由 Durable Object + WebSocket 管理，并持久化到 D1。
- 已实现 join、snapshot、add、promote、remove、restart、player started/ended 和多端 broadcast。
- WebSocket reconnect/backoff、production 断线保护和本地 fallback 已完成。
- 大屏已接 YouTube IFrame Player API，支持 autoplay attempt、播放状态同步、自动续播和错误提示。
- App 自有下一首、进度/seek 和实际可用清晰度菜单已完成；默认偏好 1080p，并跨歌曲保留本机选择。
- 手机远程重唱和切歌会同步控制大屏。

### 可靠性与运维

- D1、KV、两个 Worker 和 Durable Object bindings 已在线上验证。
- Room heartbeat、alarm 和 5 分钟 inactive cleanup 已完成。
- Debug snapshot、链接复制、手动 cleanup 和 completed/removed item 清理已完成。
- 自动化覆盖 reducer、room commands、WebSocket messages/runtime、search family/ranking、KV、rate limit、YouTube search 和 quota reset。
- 最近一次完整代码验证通过：12 个 test files、47 个 tests，以及 typecheck 和 production build。

## 待完成

这些项目不阻塞当前 MVP：

- 在 Mobile Safari、Android Chrome、iPad Safari 和 Desktop Chrome 上完成正式实机验收，重点观察 autoplay、playsinline、横竖屏和 iframe 行为。
- 为手机 preview 接入更精确的 IFrame Player API 控制，并补 iframe 加载失败的兜底。
- 增加 Worker route、Durable Object integration 和 Playwright E2E 测试。
- 根据实际使用量决定是否增加 search cache 管理、命中率观察和主动预热工具。

## 日常检查

```bash
npm run typecheck
npm run test
npm run build
```

完整运行、验收和部署方式统一维护在根目录 `README.md`。
