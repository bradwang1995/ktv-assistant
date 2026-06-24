import { MonitorPlay, Plus, Smartphone } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiClientError, createRoomViaApi } from "../lib/apiClient";
import { createRoomId, hydrateRoomSnapshot, readRoomSnapshot } from "../lib/roomState";

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const createRoom = async () => {
    setIsCreating(true);
    setNotice(null);

    try {
      const response = await createRoomViaApi();

      if (response.snapshot) {
        hydrateRoomSnapshot(response.snapshot);
      }

      navigate(response.displayUrl);
    } catch (error) {
      const roomId = createRoomId();
      readRoomSnapshot(roomId);

      if (error instanceof ApiClientError && error.code === "NON_JSON_RESPONSE") {
        setNotice("当前是 Vite 本地模式，已使用本地房间继续。");
      } else {
        setNotice("后端 API 暂不可用，已使用本地房间继续。");
      }

      navigate(`/room/${roomId}/display`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-slate-950 text-teal-300">
              <MonitorPlay size={23} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal">K歌助手</h1>
              <p className="text-sm text-slate-500">本地 MVP</p>
            </div>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 md:grid-cols-[1fr_0.9fr]">
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-medium text-teal-700">开一个房间，朋友扫码点歌</p>
            <h2 className="text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl">
              大屏播放，手机点歌，一个房间一起唱。
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              这一版先跑通核心流程：创建房间、扫码进入、搜索候选视频、加入歌单、置顶删歌、切到下一首。
            </p>
            <button
              type="button"
              onClick={createRoom}
              disabled={isCreating}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Plus size={20} />
              {isCreating ? "创建中" : "创建房间"}
            </button>
            {notice ? <p className="mt-3 text-sm text-slate-500">{notice}</p> : null}
          </div>

          <div className="grid gap-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
                  <MonitorPlay size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-950">大屏页</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    横屏显示当前视频，右上角固定二维码，没人点歌时显示空状态。
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700">
                  <Smartphone size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-950">手机页</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    竖屏点歌体验，包含「点歌」和「歌单」两个标签页。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
