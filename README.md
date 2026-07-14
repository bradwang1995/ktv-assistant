# K歌助手

一个适合朋友聚会的 Web KTV 点歌助手：大屏播放、手机扫码点歌，同一房间通过 Cloudflare Durable Object 和 WebSocket 实时同步。

Production: <https://ktv-assistant.bradwang1995.workers.dev>

## 使用方式

- `/create`：创建房间并进入大屏。
- `/room/:roomId/display`：播放当前歌曲、切歌、调整进度和清晰度，并显示手机点歌二维码。
- `/room/:roomId/mobile`：搜索、预览、点歌和管理歌单。
- `/room/:roomId/debug`：查看远端 snapshot、房间链接和 cleanup 操作。

手机端支持歌名/歌手搜索、`带原唱`、缓存推荐、单预览、搜索状态恢复、连续点歌、置顶/删除，以及远程重唱和切歌。大屏使用 YouTube IFrame Player API 自动续播，并记住本机的清晰度偏好。

## 架构

- React + TypeScript + Vite：前端与静态资源。
- Cloudflare Worker：API 和 production assets。
- Durable Object：房间状态、WebSocket 广播、心跳和 5 分钟 inactive cleanup。
- D1：房间与歌单持久化。
- KV：搜索缓存、推荐池、限流和 YouTube quota 估算。
- YouTube Data API / IFrame Player API：搜索和官方嵌入播放。

Production 资源：

| 资源 | 名称 / ID |
| --- | --- |
| Main Worker | `ktv-assistant` |
| Room Worker | `ktv-assistant-room` |
| Durable Object class | `RoomDurableObject` |
| D1 | `ktv-assistant-db` / `a2fe987b-5191-4ac3-9d01-f923d19c731a` |
| KV | `SEARCH_CACHE` / `aedd751919314f9e81f1917e59a859bd` |

`YOUTUBE_API_KEY` 已作为 encrypted secret 配置在两个 Worker 中，不应写入代码、文档或 Wrangler config。

## 本地开发

```bash
npm install
npm run dev
```

本地 Vite 模式适合 UI 开发，并会保留 browser-local fallback。D1、KV、Durable Object、WebSocket 和 production assets 的真实行为必须在线上环境验证。

## 验证

```bash
npm run typecheck
npm run test
npm run build
```

最短 production 验收流程：

1. 从 `/create` 创建一个新房间，在大屏页打开二维码对应的手机页。
2. 手机搜索并加入两首歌；确认大屏无需刷新即可同步，第一首播放、第二首排队。
3. 确认搜索模式、`带原唱`、预览、继续加载、点歌反馈和刷新后的 tab/search 状态。
4. 确认大屏自动播放尝试、进度 seek、清晰度记忆、手动下一首和自然播完自动续播。
5. 确认手机端置顶/删除，以及需要确认的重唱/切歌。
6. 打开 debug 页检查 snapshot；确认 quota 状态，并在所有客户端关闭 5 分钟后检查 inactive cleanup。
7. 发布前至少覆盖 Mobile Safari、Android Chrome、iPad Safari 和 Desktop Chrome。

API smoke test（PowerShell）：

```powershell
$base = "https://ktv-assistant.bradwang1995.workers.dev"
$room = Invoke-RestMethod -Method Post -Uri "$base/api/rooms"
Invoke-RestMethod -Uri "$base/api/rooms/$($room.roomId)/snapshot"
Invoke-RestMethod -Uri "$base/api/youtube/quota"
```

通过标准：新房间初始 queue 为空且 player 为 `idle`；手机点歌后多端实时同步；切歌或视频结束能推进队列；空队列回到 `idle`。

## 搜索规则

- Endpoint：`POST /api/rooms/:roomId/search`。
- 支持 `searchType: "song" | "artist"` 和 `includeOriginalVocal`。
- 前端最多取得 40 条缓存候选，先显示 8 条，再从当前结果继续展开，不重复请求 API。
- 冷缓存默认只使用一次 YouTube `search.list`，最多缓存 50 条；空查询推荐不消耗 search quota。
- 排序先保证歌名/歌手相关性，再优先 KTV/karaoke，最后结合伴奏、歌词、MV 和原唱意图。
- Quota 估算默认 50 calls/day，按 Pacific Time 午夜重置；状态由 `GET /api/youtube/quota` 提供。

## 部署与维护

只改主应用 Worker 或前端：

```bash
npm run build
npx wrangler deploy --keep-vars
```

如果改到 Room Durable Object，再先部署 Room Worker：

```bash
npm run build
npx wrangler deploy --config wrangler.room.toml --keep-vars
npx wrangler deploy --keep-vars
```

首次配置或恢复资源时常用命令：

```bash
npx wrangler login
npx wrangler d1 execute ktv-assistant-db --file ./migrations/0001_initial.sql --remote
npx wrangler secret put YOUTUBE_API_KEY
npx wrangler secret put YOUTUBE_API_KEY --config wrangler.room.toml
```

使用 `--keep-vars` 避免覆盖 Dashboard 中已有变量。数据库结构应通过 migration 修改，不要直接手改 production D1。

如果 production 测试失败，先确认使用的是线上域名和新房间，再检查浏览器 Console/Network、Worker bindings、`YOUTUBE_API_KEY`、quota 和 KV cache。

## 内容约束

YouTube 内容只通过官方 embed / IFrame Player API 播放；不下载、不提取、不转码、不重新托管。
