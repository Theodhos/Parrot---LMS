"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, MessageCircleQuestion, MessagesSquare, Trophy, Upload, Users, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { EventRow } from "@/components/calendar/event-row";
import { PostCard } from "@/components/community/post-card";
import { cn } from "@/lib/utils";
import { createPostAction, loadPostsAction } from "@/features/community/actions/community.actions";
import { getUploadConfig, uploadMediaFile } from "@/features/media/client/upload-media";
import type { CalendarEventDTO } from "@/features/calendar/types/calendar.types";
import type { CommunityFeedPage, CommunityPostDTO } from "@/features/community/types/community.types";
import type { CommunityPostKind } from "@/generated/prisma";

type ComposeKind = "question" | "win" | "video";

const COMPOSE_CONFIG: Record<
  ComposeKind,
  { kind: CommunityPostKind; label: string; hint: string; icon: typeof Trophy; color: string; placeholder: string }
> = {
  question: {
    kind: "QUESTION",
    label: "Ask a Question",
    hint: "Get help from our community",
    icon: MessageCircleQuestion,
    color: "#FF6B6B",
    placeholder: "What's on your mind? Ask the community anything about training, tablets, or troubleshooting...",
  },
  win: {
    kind: "WIN",
    label: "Share a Win",
    hint: "Celebrate a milestone",
    icon: Trophy,
    color: "#4CA6F8",
    placeholder: "Tell everyone what your bird just nailed -- every milestone counts!",
  },
  video: {
    kind: "VIDEO",
    label: "Upload a Video",
    hint: "Get feedback & support",
    icon: Video,
    color: "#88C654",
    placeholder: "What would you like feedback on in this clip?",
  },
};

const FILTERS: { value: CommunityPostKind | "ALL"; label: string }[] = [
  { value: "ALL", label: "Everything" },
  { value: "QUESTION", label: "Questions" },
  { value: "WIN", label: "Wins" },
  { value: "VIDEO", label: "Videos" },
];

const isComposeKind = (value: string | undefined): value is ComposeKind =>
  value === "question" || value === "win" || value === "video";

const formatMb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

export interface CommunityFeedProps {
  initialPage: CommunityFeedPage;
  /** From ?compose=question|win|video -- the dashboard's three buttons open the matching dialog. */
  initialCompose?: string;
  /** The next live call on the schedule, shown beside the feed. */
  nextCall: CalendarEventDTO | null;
}

export function CommunityFeed({ initialPage, initialCompose, nextCall }: CommunityFeedProps) {
  const [posts, setPosts] = useState<CommunityPostDTO[]>(initialPage.posts);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [filter, setFilter] = useState<CommunityPostKind | "ALL">("ALL");
  const [loading, startLoading] = useTransition();

  const [composeKind, setComposeKind] = useState<ComposeKind | null>(isComposeKind(initialCompose) ? initialCompose : null);
  const [draft, setDraft] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // The dashboard's buttons arrive with ?compose=...; once that has opened the
  // dialog, drop it from the address so a reload or a shared link does not
  // open the dialog again.
  useEffect(() => {
    if (isComposeKind(initialCompose)) router.replace("/community", { scroll: false });
  }, [initialCompose, router]);

  const kindOf = (value: CommunityPostKind | "ALL") => (value === "ALL" ? undefined : value);

  function changeFilter(value: CommunityPostKind | "ALL") {
    setFilter(value);
    startLoading(async () => {
      const result = await loadPostsAction({ kind: kindOf(value) });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPosts(result.data.posts);
      setNextCursor(result.data.nextCursor);
    });
  }

  function loadMore() {
    if (!nextCursor) return;
    startLoading(async () => {
      const result = await loadPostsAction({ kind: kindOf(filter), before: nextCursor });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPosts((prev) => [...prev, ...result.data.posts.filter((p) => !prev.some((existing) => existing.id === p.id))]);
      setNextCursor(result.data.nextCursor);
    });
  }

  function openCompose(kind: ComposeKind) {
    setDraft("");
    setVideo(null);
    setUploadProgress(null);
    setComposeError(null);
    setComposeKind(kind);
  }

  function closeCompose() {
    if (posting) return;
    setComposeKind(null);
  }

  async function chooseVideo(file: File | undefined) {
    setComposeError(null);
    if (!file) return;
    try {
      const config = await getUploadConfig("community");
      if (!config.acceptedTypes.includes(file.type)) {
        setComposeError("Choose a video file (MP4, MOV or WebM).");
        return;
      }
      if (file.size > config.maxBytes) {
        setComposeError(`That video is larger than the ${formatMb(config.maxBytes)} limit.`);
        return;
      }
      setVideo(file);
    } catch (error) {
      setComposeError(error instanceof Error ? error.message : "Could not check the video.");
    }
  }

  async function submitPost() {
    if (!composeKind) return;
    const config = COMPOSE_CONFIG[composeKind];
    const content = draft.trim();
    if (!content) {
      setComposeError("Write a few words first.");
      return;
    }
    if (config.kind === "VIDEO" && !video) {
      setComposeError("Choose a video to upload.");
      return;
    }

    setPosting(true);
    setComposeError(null);
    try {
      let videoUrl: string | undefined;
      if (config.kind === "VIDEO" && video) {
        setUploadProgress(0);
        const media = await uploadMediaFile(video, (pct) => setUploadProgress(pct), "community");
        videoUrl = media.fileUrl;
      }

      const result = await createPostAction({ kind: config.kind, content, videoUrl });
      if (!result.success) {
        setComposeError(result.error);
        return;
      }
      if (filter === "ALL" || filter === config.kind) {
        setPosts((prev) => [result.data, ...prev]);
      }
      toast.success(`${config.label} posted!`, { description: "Your post is live in the feed." });
      setComposeKind(null);
    } catch (error) {
      setComposeError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setPosting(false);
      setUploadProgress(null);
    }
  }

  const activeConfig = composeKind ? COMPOSE_CONFIG[composeKind] : null;

  return (
    <div className="flex w-full flex-col gap-6 pb-10">
      <div className="rounded-[2.5rem] border border-[#f3ecd7] bg-[#FCF6ED] p-8 shadow-sm md:p-12">
        <h1 className="font-heading mb-2 text-3xl font-bold text-[#1f1737] md:text-4xl">Community</h1>
        <p className="text-base font-medium text-[#6D5D3B]">
          Celebrate wins, ask questions, and see how other birds and their people are doing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {(Object.keys(COMPOSE_CONFIG) as ComposeKind[]).map((kind) => {
          const config = COMPOSE_CONFIG[kind];
          const Icon = config.icon;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => openCompose(kind)}
              className="group flex items-center gap-4 rounded-2xl p-4 text-left text-white transition-transform hover:-translate-y-0.5 sm:p-5"
              style={{ backgroundColor: config.color }}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white" style={{ color: config.color }}>
                <Icon className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="font-heading text-lg leading-tight font-bold">{config.label}</span>
                <span className="text-sm text-white/85">{config.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter posts">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                onClick={() => changeFilter(option.value)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
                  filter === option.value
                    ? "bg-[#1f1737] text-white"
                    : "border border-gray-200 bg-white text-[#3E341F] hover:border-[#FF5757] hover:text-[#FF5757]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {posts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
              <MessagesSquare className="size-8 text-gray-400" />
              <p className="font-heading font-semibold text-[#1F2937]">
                {loading ? "Loading..." : "Nothing here yet"}
              </p>
              {!loading && (
                <p className="text-muted-foreground max-w-sm text-sm">
                  Be the first: ask a question, share a win, or upload a clip for feedback.
                </p>
              )}
            </div>
          ) : (
            <div className={cn("flex flex-col gap-4 transition-opacity", loading && "opacity-60")}>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onRemoved={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                />
              ))}
            </div>
          )}

          {nextCursor && (
            <Button variant="outline" className="mx-auto !rounded-full" disabled={loading} onClick={loadMore}>
              {loading ? "Loading..." : "Load older posts"}
            </Button>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:col-span-4">
          <div id="office-hours" className="flex scroll-mt-24 flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E6F3FB] text-[#3B82F6]">
                <Users className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="font-heading font-semibold text-[#1F2937]">Next Live Call</span>
                <span className="text-muted-foreground text-xs">Bring your questions and get coached live</span>
              </div>
            </div>
            {nextCall ? (
              <EventRow key={`${nextCall.id}:${nextCall.rsvpedByMe}`} event={nextCall} compact />
            ) : (
              <p className="text-muted-foreground text-sm">No live call is scheduled right now.</p>
            )}
            <Link
              href="/calendar"
              className="flex items-center gap-2 text-sm font-bold text-[#3B82F6] transition-colors hover:text-blue-700"
            >
              See the full calendar
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 text-sm text-[#4B5563] shadow-sm sm:p-7">
            <span className="mb-3 block text-[11px] font-bold tracking-widest text-[#FF5757] uppercase">How it works</span>
            <ul className="flex list-disc flex-col gap-2 pl-4">
              <li>Ask anything -- coaches and other members reply in the comments.</li>
              <li>Share a win so everyone can celebrate it with you.</li>
              <li>Upload a short clip to get feedback on your practice.</li>
              <li>Be kind. Report anything that does not belong here.</li>
            </ul>
          </div>
        </aside>
      </div>

      <Dialog open={composeKind !== null} onOpenChange={(open) => !open && closeCompose()}>
        <DialogContent>
          {activeConfig && (
            <>
              <DialogHeader>
                <DialogTitle>{activeConfig.label}</DialogTitle>
                <DialogDescription>Your post is visible to the whole Parrot Kindergarten community.</DialogDescription>
              </DialogHeader>

              <Textarea
                autoFocus
                rows={4}
                maxLength={2000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={activeConfig.placeholder}
                aria-label="Your post"
              />

              {activeConfig.kind === "VIDEO" && (
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg"
                    className="hidden"
                    onChange={(e) => void chooseVideo(e.target.files?.[0])}
                  />
                  {video ? (
                    <div className="flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-sm">
                      <Video className="size-4 shrink-0 text-[#5C9A2B]" />
                      <span className="flex-1 truncate" title={video.name}>
                        {video.name}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {uploadProgress !== null ? `${Math.round(uploadProgress)}%` : formatMb(video.size)}
                      </span>
                      {!posting && (
                        <button
                          type="button"
                          onClick={() => {
                            setVideo(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          aria-label="Remove video"
                          className="text-gray-400 hover:text-[#FF5757]"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-muted-foreground flex flex-col items-center gap-1 rounded-xl border border-dashed px-3 py-5 text-xs transition-colors hover:border-[#88C654] hover:text-[#5C9A2B]"
                    >
                      <Upload className="size-5" />
                      <span className="text-foreground text-sm font-medium">Choose a video</span>
                      MP4, MOV or WebM
                    </button>
                  )}
                  {uploadProgress !== null && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full bg-[#88C654] transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </div>
              )}

              {composeError && <p className="text-destructive text-sm">{composeError}</p>}

              <DialogFooter>
                <Button variant="outline" className="!rounded-full" disabled={posting} onClick={closeCompose}>
                  Cancel
                </Button>
                <Button
                  className="!rounded-full !text-white"
                  style={{ backgroundColor: activeConfig.color }}
                  disabled={posting || draft.trim().length === 0}
                  onClick={() => void submitPost()}
                >
                  {posting ? (uploadProgress !== null && uploadProgress < 100 ? "Uploading..." : "Posting...") : "Post"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
