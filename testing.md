# Production Testing Guide

Last updated: 2026-06-25

This guide is for testing the real deployed app, not the local Vite server.

Production URL:

```txt
https://ktv-assistant.bradwang1995.workers.dev
```

The local server is still useful for quick UI development, but it is not the source of truth for production behavior. Real D1 persistence, KV search cache, Durable Object room state, and WebSocket routing should be tested against the production URL above.

## 0. Before You Start

Use a fresh browser tab or an incognito window when you want a clean test. The app stores room snapshots in `localStorage`, so old local browser data can make a test feel confusing.

If you want to test the latest code from `main`, make sure it has actually been deployed to Cloudflare. Pushing to GitHub is not the same thing as deploying unless Cloudflare auto-deploy is configured.

Manual deploy commands:

```bash
npm run build
npx wrangler deploy --config wrangler.room.toml
npx wrangler deploy
```

Quick production version sanity check:

1. Open `https://ktv-assistant.bradwang1995.workers.dev`.
2. The page should load with HTTP `200`.
3. Create a room from `/create`.
4. The display URL should be under the same `workers.dev` origin.

On 2026-06-25, the live production bundle was checked and contained the YouTube IFrame Player API code.

## 1. Main End-To-End Browser Test

This is the most important test.

1. Open:

```txt
https://ktv-assistant.bradwang1995.workers.dev/create
```

2. Click the create-room button.
3. You should land on:

```txt
/room/<roomId>/display
```

4. Keep this display page open on your laptop, TV, or desktop browser.
5. Open the mobile page by scanning the QR code, clicking the mobile link, or manually opening:

```txt
https://ktv-assistant.bradwang1995.workers.dev/room/<roomId>/mobile
```

6. On the mobile page, search for a song, for example:

```txt
后来
```

7. Expected search result behavior:

- Results appear from the backend search API.
- The cards show YouTube preview iframes.
- Selecting a card highlights it.
- Tapping the add-song button moves you to the queue tab.

8. Expected display behavior after adding the first song:

- The display page updates without refresh.
- The first song becomes the current song.
- The queue count updates.
- The display page still shows the QR code.

9. Add a second song from the mobile page.
10. Expected queue behavior:

- The current song is not interrupted.
- The second song appears as upcoming.
- Queue changes appear on both display and mobile without refresh.

## 2. Display Player Test

This tests the production YouTube IFrame Player API path.

1. After the first song appears on the display page, click `开始 K 歌`.
2. Expected behavior:

- The YouTube player starts.
- The room sends `PLAYER_STARTED` only after YouTube reports the player is actually playing.
- If autoplay is blocked, the display shows a browser/autoplay warning and you can click start again or interact with the player.

3. Use the display page `下一首` button for a fast auto-advance test.
4. Expected behavior:

- The current song is marked complete.
- The next queued song becomes current.
- The display attempts to play the next song automatically.

5. For a true end-of-video test, let a short video finish naturally.
6. Expected behavior:

- YouTube reports `ENDED`.
- The app sends `PLAYER_ENDED`.
- The next queued song becomes current.
- If the queue is empty, the room returns to idle.

## 3. Production API Smoke Test

PowerShell:

```powershell
$base = "https://ktv-assistant.bradwang1995.workers.dev"
$room = Invoke-RestMethod -Method Post -Uri "$base/api/rooms"
$room | ConvertTo-Json -Depth 20

$roomId = $room.roomId
Invoke-RestMethod -Uri "$base/api/rooms/$roomId/snapshot" | ConvertTo-Json -Depth 20
```

Expected:

- `roomId` is an 8-character lowercase room id.
- `absoluteDisplayUrl` points to the production display page.
- `absoluteMobileUrl` points to the production mobile page.
- Snapshot has `queue: []`.
- Snapshot has `playback.playerState: "idle"`.

Search smoke test:

```powershell
$body = @{
  query = "后来"
  limit = 4
  cacheFill = $false
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "$base/api/rooms/$roomId/search" `
  -ContentType "application/json" `
  -Body $body |
  ConvertTo-Json -Depth 20
```

Expected:

- HTTP request succeeds.
- Response includes `query`, `normalizedQuery`, `cached`, and `results`.
- `results` has 0 to 4 items.
- With `YOUTUBE_API_KEY` configured, results should be real YouTube results.

Use `cacheFill = $false` for quick tests so you do not spend extra YouTube quota filling the larger cache pool.

## 4. WebSocket Smoke Test

Use the browser DevTools console on any production page.

```js
const roomId = "<roomId>";
const ws = new WebSocket(
  `wss://ktv-assistant.bradwang1995.workers.dev/api/rooms/${roomId}/ws`,
);

let latestMessage = null;

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "JOIN_ROOM",
    role: "mobile",
    clientId: crypto.randomUUID(),
  }));
  ws.send(JSON.stringify({ type: "PING" }));
};

ws.onmessage = (event) => {
  latestMessage = JSON.parse(event.data);
  console.log("WS", latestMessage);
};

ws.onerror = (event) => console.log("WS error", event);
ws.onclose = (event) => console.log("WS close", event.code, event.reason);
```

Expected:

- `JOIN_ROOM` returns `ROOM_SNAPSHOT`.
- `PING` returns `PONG`.
- Opening a second client for the same room causes connected-client updates.

Queue command test:

```js
ws.send(JSON.stringify({
  type: "ADD_QUEUE_ITEM",
  payload: {
    videoId: "dQw4w9WgXcQ",
    title: "Manual Test Song 1",
    channelTitle: "Manual Test",
  },
}));
```

Expected:

- You receive `ROOM_UPDATED`.
- The added song becomes `playing` if the room was idle.
- `playback.currentVideoId` matches the added `videoId`.

Add a second item:

```js
ws.send(JSON.stringify({
  type: "ADD_QUEUE_ITEM",
  payload: {
    videoId: "kJQP7kiw5Fk",
    title: "Manual Test Song 2",
    channelTitle: "Manual Test",
  },
}));
```

Expected:

- The second item is `queued`.
- The current item is still the first item.

Simulate current song ending:

```js
const current = latestMessage.payload.queue.find((item) => item.status === "playing");

ws.send(JSON.stringify({
  type: "PLAYER_ENDED",
  payload: {
    queueItemId: current.id,
    videoId: current.videoId,
  },
}));
```

Expected:

- The previous current item becomes `completed`.
- The next queued item becomes `playing`.
- If no queued item exists, `playback.playerState` becomes `idle`.

## 5. What Not To Test Locally

Do not use `http://localhost:5173` to verify these production features:

- Durable Object room state
- Real WebSocket room sync
- Remote D1 persistence
- Remote KV search cache
- Real production asset deployment

Local Vite mode can fall back to local browser state, so it can look like the app works while completely bypassing the production backend.

## 6. Pass Criteria

A production test pass means:

- `/create` creates a real room.
- Display and mobile URLs both use `workers.dev`.
- Mobile search returns usable results.
- Adding songs from mobile updates display without refresh.
- Two clients in the same room stay synchronized.
- Display `开始 K 歌` starts YouTube playback.
- `PLAYER_STARTED` is reflected in the room after playback starts.
- `下一首` advances to the next queued song.
- Natural YouTube video ending also advances the room.
- Empty queue returns the room to idle.

## 7. If Something Fails

Check these in order:

1. Confirm you are using `https://ktv-assistant.bradwang1995.workers.dev`, not localhost.
2. Create a fresh room.
3. Open browser DevTools and check Console and Network.
4. Run the API smoke test.
5. Run the WebSocket smoke test.
6. If latest `main` behavior is missing, deploy with `npx wrangler deploy`.
7. If search fails, check `YOUTUBE_API_KEY`, quota, and `SEARCH_CACHE`.
8. If room sync fails, check `ROOM_OBJECT`, `ktv-assistant-room`, and D1 bindings.
