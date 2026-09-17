"use client";

import { useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rewrites a youtube.com/youtu.be watch URL into its embeddable form; returns null for anything else. */
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) return url;
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LessonVideoPlayer({ title, videoUrl }: { title: string; videoUrl: string }) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-3xl bg-black text-white/70 shadow-sm">
        <TriangleAlert className="size-6" />
        <p className="text-sm font-medium">This video isn&apos;t available right now.</p>
      </div>
    );
  }

  if (embedUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-3xl bg-black shadow-sm">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>
    );
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      // play() returns a rejecting promise (e.g. NotSupportedError) rather than throwing --
      // left uncaught, that rejection surfaces as an unhandled runtime error.
      video.play().then(
        () => setPlaying(true),
        () => setHasError(true),
      );
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function toggleFullscreen() {
    frameRef.current?.requestFullscreen?.();
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Number(e.target.value);
    setCurrent(video.currentTime);
  }

  return (
    <div ref={frameRef} className="group relative w-full overflow-hidden rounded-3xl bg-black shadow-sm">
      <video
        ref={videoRef}
        src={videoUrl}
        className="aspect-video w-full"
        onClick={togglePlay}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
        onError={() => setHasError(true)}
      />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={current}
          onChange={seek}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-[#FF6B6B]"
        />
        <div className="flex items-center gap-4 text-white">
          <button type="button" onClick={togglePlay} className="hover:text-[#FFD97D]">
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
          </button>
          <button type="button" onClick={toggleMute} className="hover:text-[#FFD97D]">
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <span className="text-xs font-semibold tabular-nums">
            {formatTime(current)} / {formatTime(duration)}
          </span>
          <span className="ml-auto flex items-center gap-4">
            <Settings className={cn("size-4 opacity-80")} />
            <button type="button" onClick={toggleFullscreen} className="hover:text-[#FFD97D]">
              <Maximize className="size-4" />
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
