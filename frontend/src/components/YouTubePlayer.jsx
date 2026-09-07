import { Pause, Play, X } from 'lucide-react';
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

// SPEC.md §5/§6: bind onStateChange, post progress every 15s and on pause; default
// to 480p since trainees are paying for their own data.
//
// Native YouTube controls are hidden (playerVars.controls: 0, disablekb: 1) and
// replaced with a play/pause-only button — no seek bar, no keyboard seeking. On top
// of that, currentTime is polled every 2s against `maxReached` — the furthest point
// ever legitimately played to. Rewinding to re-watch something (and seeking back
// forward, up to that same furthest point) is always allowed — only a jump past
// `maxReached` counts as a skip, since that's the only way to reach content that
// hasn't actually played in real time. A skip snaps back to `maxReached` and flags
// the video so it can never count as watched until staff resets it
// (backend/src/routes/videos.js).
export default function YouTubePlayer({ video, onClose }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
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
        playerVars: { vq: 'small', controls: 0, disablekb: 1, modestbranding: 1, rel: 0 },
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

    return () => {
      cancelled = true;
      clearInterval(checkInterval);
      clearInterval(postInterval);
      clearTimeout(warningTimeout);
      playerRef.current?.destroy?.();
    };
  }, [video._id, video.youtubeId]);

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo(); else p.playVideo();
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
          <div className="relative">
            <div ref={containerRef} className="aspect-video w-full" />
            {skipWarning && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs font-medium px-3 py-1.5 rounded-full pointer-events-none">
                Skipping ahead isn't allowed — rewound to where you left off.
              </div>
            )}
          </div>
          <button onClick={togglePlay}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
