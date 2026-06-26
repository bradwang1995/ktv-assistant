import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  loadYouTubeIframeApi,
  YOUTUBE_PLAYER_STATE,
  type YouTubePlayer,
  type YouTubePlayerErrorEvent,
  type YouTubePlayerEvent,
  type YouTubePlayerStateChangeEvent,
} from "../lib/youtubeIframeApi";

type PlayerStatus =
  | "loading"
  | "ready"
  | "buffering"
  | "playing"
  | "paused"
  | "ended"
  | "blocked"
  | "error";

interface FullscreenPlayerProps {
  videoId: string;
  title: string;
  playRequestId: number;
  onPlaybackStarted: () => void;
  onPlaybackEnded: () => void;
  onPlaybackError: (errorCode: number) => void;
  onAutoplayBlocked: () => void;
}

export interface FullscreenPlayerHandle {
  play: () => void;
}

export const FullscreenPlayer = forwardRef<FullscreenPlayerHandle, FullscreenPlayerProps>(
  function FullscreenPlayer(
    {
      videoId,
      title,
      playRequestId,
      onPlaybackStarted,
      onPlaybackEnded,
      onPlaybackError,
      onAutoplayBlocked,
    },
    ref,
  ) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const pendingPlayRef = useRef(false);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const lastPlayRequestRef = useRef(0);
  const playRetryTimeoutsRef = useRef<number[]>([]);
  const callbacksRef = useRef({
    onPlaybackStarted,
    onPlaybackEnded,
    onPlaybackError,
    onAutoplayBlocked,
  });
  const [status, setStatus] = useState<PlayerStatus>("loading");
  const [errorCode, setErrorCode] = useState<number | null>(null);

  const clearPlayRetryTimeouts = () => {
    for (const timeoutId of playRetryTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }

    playRetryTimeoutsRef.current = [];
  };

  const requestPlay = (player: YouTubePlayer) => {
    clearPlayRetryTimeouts();
    pendingPlayRef.current = true;
    player.playVideo();

    for (const delay of [250, 900]) {
      const timeoutId = window.setTimeout(() => {
        if (pendingPlayRef.current) {
          player.playVideo();
        }
      }, delay);

      playRetryTimeoutsRef.current.push(timeoutId);
    }
  };

  useImperativeHandle(ref, () => ({
    play() {
      if (playerRef.current) {
        requestPlay(playerRef.current);
      } else {
        pendingPlayRef.current = true;
      }
    },
  }));

  useEffect(() => {
    callbacksRef.current = {
      onPlaybackStarted,
      onPlaybackEnded,
      onPlaybackError,
      onAutoplayBlocked,
    };
  }, [onAutoplayBlocked, onPlaybackEnded, onPlaybackError, onPlaybackStarted]);

  useEffect(() => {
    const shell = shellRef.current;
    let cancelled = false;

    startedRef.current = false;
    endedRef.current = false;
    pendingPlayRef.current = playRequestId > 0;
    lastPlayRequestRef.current = playRequestId;
    setStatus("loading");
    setErrorCode(null);

    if (!shell) {
      setStatus("error");
      return;
    }

    shell.replaceChildren();
    const host = document.createElement("div");
    host.className = "h-full w-full";
    shell.appendChild(host);

    loadYouTubeIframeApi()
      .then((api) => {
        if (cancelled) {
          return;
        }

        const player = new api.Player(host, {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: {
            autoplay: playRequestId > 0 ? 1 : 0,
            controls: 1,
            enablejsapi: 1,
            iv_load_policy: 3,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: handleReady,
            onStateChange: handleStateChange,
            onError: handleError,
            onAutoplayBlocked: handleAutoplayBlocked,
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      clearPlayRetryTimeouts();
      playerRef.current?.destroy();
      playerRef.current = null;
      shell.replaceChildren();
    };

    function handleReady(event: YouTubePlayerEvent) {
      setStatus("ready");
      const currentShell = shellRef.current;

      if (currentShell) {
        allowIframeAutoplay(event.target, currentShell);
      }

      if (pendingPlayRef.current) {
        requestPlay(event.target);
      }
    }

    function handleStateChange(event: YouTubePlayerStateChangeEvent) {
      if (event.data === YOUTUBE_PLAYER_STATE.PLAYING) {
        pendingPlayRef.current = false;
        clearPlayRetryTimeouts();
        setStatus("playing");

        if (!startedRef.current) {
          startedRef.current = true;
          callbacksRef.current.onPlaybackStarted();
        }
        return;
      }

      if (event.data === YOUTUBE_PLAYER_STATE.ENDED) {
        clearPlayRetryTimeouts();
        setStatus("ended");

        if (!endedRef.current) {
          endedRef.current = true;
          callbacksRef.current.onPlaybackEnded();
        }
        return;
      }

      if (event.data === YOUTUBE_PLAYER_STATE.BUFFERING) {
        setStatus("buffering");
        return;
      }

      if (event.data === YOUTUBE_PLAYER_STATE.PAUSED) {
        setStatus("paused");
        return;
      }

      if (event.data === YOUTUBE_PLAYER_STATE.CUED) {
        setStatus("ready");
      }
    }

    function handleError(event: YouTubePlayerErrorEvent) {
      clearPlayRetryTimeouts();
      setErrorCode(event.data);
      setStatus("error");
      callbacksRef.current.onPlaybackError(event.data);
    }

    function handleAutoplayBlocked() {
      pendingPlayRef.current = false;
      clearPlayRetryTimeouts();
      setStatus("blocked");
      callbacksRef.current.onAutoplayBlocked();
    }
  }, [videoId]);

  useEffect(() => {
    if (playRequestId <= lastPlayRequestRef.current) {
      return;
    }

    lastPlayRequestRef.current = playRequestId;
    pendingPlayRef.current = true;
    if (playerRef.current) {
      requestPlay(playerRef.current);
    }
  }, [playRequestId]);

  const statusText = getStatusText(status, errorCode);

  return (
    <>
      <div
        ref={shellRef}
        title={title}
        className="absolute inset-0 h-full w-full bg-black [&_iframe]:h-full [&_iframe]:w-full"
      />
      {statusText ? (
        <div className="pointer-events-none absolute left-4 top-16 z-10 rounded-lg bg-black/60 px-3 py-2 text-sm font-medium text-white backdrop-blur">
          {statusText}
        </div>
      ) : null}
    </>
  );
  },
);

function allowIframeAutoplay(player: YouTubePlayer, shell: HTMLElement) {
  const iframe = player.getIframe?.() ?? shell.querySelector("iframe");

  iframe?.setAttribute(
    "allow",
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
  );
}

function getStatusText(status: PlayerStatus, errorCode: number | null) {
  switch (status) {
    case "loading":
      return "播放器加载中";
    case "buffering":
      return "缓冲中";
    case "blocked":
      return "浏览器阻止了自动播放";
    case "error":
      return errorCode ? `播放失败 (${errorCode})` : "播放失败";
    default:
      return "";
  }
}
