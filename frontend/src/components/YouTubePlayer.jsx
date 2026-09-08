import { Gauge, Maximize, Minimize, Pause, Play, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';

let apiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return apiPromise;
}

// How much slack (seconds) a forward jump gets before it counts as a skip — covers
// interval jitter and brief buffering stalls, not enough to skip past real content.
const SKIP_TOLERANCE_S = 3;
const CHECK_INTERVAL_MS = 2000;
const SPEEDS = [1, 1.25, 1.5, 2];

// SPEC.md §5/§6: bind onStateChange, post progress every 15s and on pause; default
// to 480p since trainees are paying for their own data.
//
// `controls: 0` only hides YouTube's bottom control bar (seek bar, native play button)
// — it does NOT hide YouTube's own title/branding overlay, which still shows Share,
// Watch Later, related-video thumbnails and a "Watch on YouTube" link. Those are
// direct escape hatches to the real YouTube site where nothing here is tracked, so a
// transparent click-blocking div sits on top of the entire iframe: every click is
// swallowed (routed to our own play/pause instead) and right-click is disabled. The
// only ways to interact with the video are the four controls below the frame — Play/
// Pause, Speed, and Fullscreen — nothing else.
//
// currentTime is polled every 2s against `maxReached` — the furthest point ever
// legitimately played to. Rewinding to re-watch something (and seeking back forward,
// up to that same furthest point) is always allowed — only a jump past `maxReached`
// counts as a skip, since that's the only way to reach content that hasn't actually
// played in real time. A skip snaps back to `maxReached` and flags the video so it
// can never count as watched until staff resets it (backend/src/routes/videos.js).
export default function YouTubePlayer({ video, onClose }) {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [skipWarning, setSkipWarning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let checkInterval;
    let postInterval;
    let warningTimeout;
    let maxReached = 0;
    let lastCheckedAt = Date.now();
    let skippedSinceLastPost = false;

    function postProgress() {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      const seconds = Math.floor(maxReached);
      api.post(`/videos/${video._id}/progress`, { seconds, skipped: skippedSinceLastPost }).catch(() => {});
      skippedSinceLastPost = false;
    }

    function checkForSkip() {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      const now = Date.now();
      const elapsedS = (now - lastCheckedAt) / 1000;
      const current = p.getCurrentTime();
      if (current > maxReached + elapsedS + SKIP_TOLERANCE_S) {
        p.seekTo(maxReached, true);
        skippedSinceLastPost = true;
        setSkipWarning(true);
        clearTimeout(warningTimeout);
        warningTimeout = setTimeout(() => setSkipWarning(false), 3000);
      } else {
        maxReached = Math.max(maxReached, current);
      }
      lastCheckedAt = now;
    }

    loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId: video.youtubeId,
        playerVars: {
          vq: 'small', controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 0, iv_load_policy: 3,
        },
        events: {
          onReady: (e) => {
            try { e.target.setPlaybackQuality('small'); } catch { /* not all clients honor this */ }
            checkInterval = setInterval(checkForSkip, CHECK_INTERVAL_MS);
            postInterval = setInterval(postProgress, 15000);
          },
          onStateChange: (e) => {
            setPlaying(e.data === YT.PlayerState.PLAYING);
            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) postProgress();
          },
        },
      });
    });

    function onFullscreenChange() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      cancelled = true;
      clearInterval(checkInterval);
      clearInterval(postInterval);
      clearTimeout(warningTimeout);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      playerRef.current?.destroy?.();
    };
  }, [video._id, video.youtubeId]);

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo(); else p.playVideo();
  }

  function setPlaybackSpeed(rate) {
    playerRef.current?.setPlaybackRate?.(rate);
    setSpeed(rate);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      wrapperRef.current?.requestFullscreen?.();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">{video.title ?? video.youtubeId}</h2>
            <div className="text-xs text-gray-400 mt-0.5">{video.channel}</div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0 ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <div ref={wrapperRef} className={`relative ${fullscreen ? 'w-screen h-screen flex items-center bg-black' : ''}`}>
            <div ref={containerRef} className="aspect-video w-full" />
            {/* Swallows every click/right-click meant for YouTube's own overlay (Share,
                Watch Later, related videos, "Watch on YouTube") — the video can only be
                controlled through the buttons below. */}
            <div className="absolute inset-0" onClick={togglePlay} onContextMenu={(e) => e.preventDefault()} />
            {skipWarning && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs font-medium px-3 py-1.5 rounded-full pointer-events-none">
                Skipping ahead isn't allowed — rewound to where you left off.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-3">
            <button onClick={togglePlay}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {playing ? 'Pause' : 'Play'}
            </button>

            <div className="flex items-center gap-1 px-1 py-1 rounded-lg bg-gray-100 dark:bg-gray-700">
              <Gauge className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
              {SPEEDS.map((s) => (
                <button key={s} onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                    speed === s ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                  {s}x
                </button>
              ))}
            </div>

            <button onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 ml-auto">
              {fullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              {fullscreen ? 'Exit full screen' : 'Full screen'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
