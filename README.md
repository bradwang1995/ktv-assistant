# K歌助手

一个面向朋友聚会的 Web KTV 点歌助手。当前版本是第一轮本地 MVP：先把大屏页、手机点歌页、二维码入口、模拟搜索、跨标签页歌单同步跑起来，后续再逐步接 Cloudflare Durable Objects、D1、KV 和真实 YouTube Data API。

## MVP 已包含

- `/create` 创建房间并进入大屏页
- `/room/:roomId/display` 大屏播放页，显示二维码和当前歌曲
- `/room/:roomId/mobile` 手机点歌页，包含「点歌」和「歌单」两个标签
- 模拟 YouTube 搜索，返回 4 个候选视频
- 候选视频可预览、选择并加入歌单
- 本地跨标签页同步歌单、置顶、删歌、下一首
- Cloudflare 配置草稿和 D1 初始 migration

## 本地运行

```bash
npm install
npm run dev
```

打开 `/create` 创建房间。大屏页右上角二维码会指向同一个房间的手机点歌页。

## 验证

```bash
npm run build
npm run test
```

## Cloudflare backend notes

当前仓库里有两份 Wrangler 配置：

- `wrangler.toml`：Cloudflare Pages 前端和 Pages Functions。
- `wrangler.room.toml`：Room Durable Object Worker。

Cloudflare Pages Functions 可以绑定 Durable Object，但 Durable Object class 需要由单独的 Worker 创建和部署。后续接真实 Cloudflare 资源时，需要先创建 D1/KV，并把两个 Wrangler 文件里的 placeholder id 替换成真实资源 id。

## 后续方向

1. 用 Cloudflare Worker + Durable Object 替换本地同步层。
2. 接 D1 持久化房间、歌单和播放状态。
3. 接 KV + YouTube Data API 搜索。
4. 用 YouTube IFrame Player API 实现自动播下一首和错误处理。
