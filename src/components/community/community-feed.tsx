"use client";

import { useState } from "react";
import {
  Heart,
  MessageCircle,
  PartyPopper,
  MessageCircleQuestion,
  Trophy,
  Video,
  Users,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ComposeKind = "question" | "win" | "video";

interface Post {
  id: string;
  userName: string;
  userAvatar: string;
  timeAgo: string;
  content: string;
  likes: number;
  comments: number;
  celebrations: number;
  badge?: string;
}

const SEED_POSTS: Post[] = [
  {
    id: "1",
    userName: "Ellie's Update",
    userAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop",
    timeAgo: "2 hours ago",
    content:
      "Ellie said \"banana\" clearly today for the first time! 🍌 We practiced with her favorite treat board and she nailed it. So proud!",
    likes: 25,
    comments: 6,
    celebrations: 3,
    badge: "Top Contributor",
  },
  {
    id: "2",
    userName: "Carl & Mango",
    userAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop",
    timeAgo: "6 hours ago",
    content: "Big win! Mango used his speech board to ask for \"outside\" all on his own. Consistency really pays off!",
    likes: 18,
    comments: 4,
    celebrations: 2,
  },
  {
    id: "3",
    userName: "Sam & Kiwi",
    userAvatar: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?q=80&w=150&auto=format&fit=crop",
    timeAgo: "1 day ago",
    content: "Anyone else's bird go through a shy phase before a breakthrough? Kiwi went quiet for a week then said 3 new words in one day.",
    likes: 12,
    comments: 9,
    celebrations: 1,
  },
];

const COMPOSE_CONFIG: Record<ComposeKind, { label: string; icon: typeof MessageCircleQuestion; color: string; placeholder: string }> = {
  question: {
    label: "Ask a Question",
    icon: MessageCircleQuestion,
    color: "#FF6B6B",
    placeholder: "What's on your mind? Ask the community anything about training, tablets, or troubleshooting…",
  },
  win: {
    label: "Share a Win",
    icon: Trophy,
    color: "#4CA6F8",
    placeholder: "Tell everyone what your bird just nailed — every milestone counts!",
  },
  video: {
    label: "Upload a Video",
    icon: Video,
    color: "#88C654",
    placeholder: "Describe the clip you'd like feedback on (video upload coming soon)…",
  },
};

interface ReactionState {
  liked: boolean;
  celebrated: boolean;
  likes: number;
  celebrations: number;
}

function initialReaction(post: Post): ReactionState {
  return { liked: false, celebrated: false, likes: post.likes, celebrations: post.celebrations };
}

export function CommunityFeed({ userName, initialCompose }: { userName: string; initialCompose?: string }) {
  const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
  const [reactions, setReactions] = useState<Record<string, ReactionState>>(() =>
    Object.fromEntries(SEED_POSTS.map((p) => [p.id, initialReaction(p)])),
  );
  const [composeKind, setComposeKind] = useState<ComposeKind | null>(() =>
    initialCompose === "question" || initialCompose === "win" || initialCompose === "video" ? initialCompose : null,
  );
  const [draft, setDraft] = useState("");

  function openCompose(kind: ComposeKind) {
    setDraft("");
    setComposeKind(kind);
  }

  function submitPost() {
    if (!composeKind || draft.trim().length === 0) return;
    const post: Post = {
      id: crypto.randomUUID(),
      userName: `${userName} (you)`,
      userAvatar: "https://images.unsplash.com/photo-1522858547137-f1dcec554f55?q=80&w=150&auto=format&fit=crop",
      timeAgo: "Just now",
      content: draft.trim(),
      likes: 0,
      comments: 0,
      celebrations: 0,
    };
    setPosts((prev) => [post, ...prev]);
    setReactions((prev) => ({ ...prev, [post.id]: initialReaction(post) }));
    toast.success(`${COMPOSE_CONFIG[composeKind].label} posted!`, { description: "Your update is live in the feed." });
    setComposeKind(null);
    setDraft("");
  }

  function toggleLike(id: string) {
    setReactions((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, liked: !current.liked, likes: current.liked ? current.likes - 1 : current.likes + 1 } };
    });
  }

  function toggleCelebrate(id: string) {
    setReactions((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: { ...current, celebrated: !current.celebrated, celebrations: current.celebrated ? current.celebrations - 1 : current.celebrations + 1 },
      };
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <div className="rounded-[2.5rem] border border-[#f3ecd7] bg-[#FCF6ED] p-8 shadow-sm md:p-12">
        <h1 className="font-heading mb-2 text-3xl font-bold text-[#1f1737] md:text-4xl">Community</h1>
        <p className="text-base font-medium text-[#6D5D3B]">
          Celebrate wins, ask questions, and see how other birds and their people are doing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(COMPOSE_CONFIG) as ComposeKind[]).map((kind) => {
          const config = COMPOSE_CONFIG[kind];
          const Icon = config.icon;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => openCompose(kind)}
              className="group flex items-center gap-3 rounded-2xl p-4 text-left text-white transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: config.color }}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/25">
                <Icon className="size-5" />
              </span>
              <span className="font-heading font-bold leading-tight">{config.label}</span>
            </button>
          );
        })}
      </div>

      <div id="office-hours" className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 sm:flex-row sm:items-center sm:justify-between scroll-mt-24">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#E6F3FB] text-[#3B82F6]">
            <Users className="size-6" />
          </span>
          <div className="flex flex-col">
            <span className="font-heading font-semibold text-[#1F2937]">Weekly Office Hours</span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" /> Every Thursday · 3:00 PM EST
            </span>
          </div>
        </div>
        <Button
          className="!rounded-full !bg-[#3B82F6] !text-white hover:!bg-blue-600"
          onClick={() => toast.info("Office hours go live 10 minutes before the call.", { description: "We'll remind you when it starts." })}
        >
          Join or watch replay
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {posts.map((post) => {
          const reaction = reactions[post.id] ?? initialReaction(post);
          return (
            <div key={post.id} className="flex gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <img src={post.userAvatar} alt={post.userName} className="size-10 shrink-0 rounded-full object-cover" />
              <div className="flex flex-1 flex-col">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-heading font-semibold text-[#1F2937]">{post.userName}</span>
                  {post.badge && (
                    <span className="rounded bg-[#FFE4E4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FF5757]">
                      {post.badge}
                    </span>
                  )}
                </div>
                <span className="mb-2 text-xs text-muted-foreground">{post.timeAgo}</span>
                <p className="mb-3 text-sm leading-relaxed text-[#4B5563]">{post.content}</p>
                <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                  <button
                    type="button"
                    onClick={() => toggleLike(post.id)}
                    className={cn("flex items-center gap-1.5 transition-colors hover:text-[#FF5757]", reaction.liked && "text-[#FF5757]")}
                  >
                    <Heart className={cn("size-4", reaction.liked && "fill-current")} /> {reaction.likes}
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.info("Comments are coming soon.")}
                    className="flex items-center gap-1.5 transition-colors hover:text-blue-500"
                  >
                    <MessageCircle className="size-4" /> {post.comments}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCelebrate(post.id)}
                    className={cn("flex items-center gap-1.5 transition-colors hover:text-yellow-500", reaction.celebrated && "text-yellow-500")}
                  >
                    <PartyPopper className="size-4" /> {reaction.celebrations}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={composeKind !== null} onOpenChange={(open) => !open && setComposeKind(null)}>
        <DialogContent>
          {composeKind && (
            <>
              <DialogHeader>
                <DialogTitle>{COMPOSE_CONFIG[composeKind].label}</DialogTitle>
                <DialogDescription>Your post is visible to the whole Parrot Kindergarten community.</DialogDescription>
              </DialogHeader>
              <Textarea
                autoFocus
                rows={4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={COMPOSE_CONFIG[composeKind].placeholder}
              />
              <DialogFooter>
                <Button
                  className="!rounded-full !text-white"
                  style={{ backgroundColor: COMPOSE_CONFIG[composeKind].color }}
                  disabled={draft.trim().length === 0}
                  onClick={submitPost}
                >
                  Post
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
