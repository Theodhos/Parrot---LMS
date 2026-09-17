"use client";

import { useState } from "react";
import { Heart, MessageCircle, PartyPopper, MoreHorizontal, ArrowRight, Flag, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CommunityWin {
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

const MOCK_WINS: CommunityWin[] = [
  {
    id: "1",
    userName: "Ellie's Update",
    userAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop",
    timeAgo: "2 hours ago",
    content: "Ellie said \"banana\" clearly today for the first time! 🍌 We practiced with her favorite treat board and she nailed it. So proud!",
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
];

interface WinReactionState {
  liked: boolean;
  celebrated: boolean;
  likes: number;
  celebrations: number;
}

function initialReactionState(win: CommunityWin): WinReactionState {
  return { liked: false, celebrated: false, likes: win.likes, celebrations: win.celebrations };
}

export function CommunityWinsCard() {
  const [reactions, setReactions] = useState<Record<string, WinReactionState>>(() =>
    Object.fromEntries(MOCK_WINS.map((win) => [win.id, initialReactionState(win)])),
  );

  function toggleLike(winId: string) {
    setReactions((prev) => {
      const current = prev[winId];
      if (!current) return prev;
      return {
        ...prev,
        [winId]: {
          ...current,
          liked: !current.liked,
          likes: current.liked ? current.likes - 1 : current.likes + 1,
        },
      };
    });
  }

  function toggleCelebrate(winId: string) {
    setReactions((prev) => {
      const current = prev[winId];
      if (!current) return prev;
      return {
        ...prev,
        [winId]: {
          ...current,
          celebrated: !current.celebrated,
          celebrations: current.celebrated ? current.celebrations - 1 : current.celebrations + 1,
        },
      };
    });
  }

  function handleComment(win: CommunityWin) {
    toast.info(`Opening comments on ${win.userName}'s post…`, {
      description: "Head to Community to join the conversation.",
    });
  }

  function handleReport(win: CommunityWin) {
    toast.success("Thanks -- we'll take a look.", { description: `Reported ${win.userName}'s post.` });
  }

  function handleHide(win: CommunityWin) {
    toast("Post hidden from your feed.", { description: `You won't see updates from ${win.userName} for a while.` });
  }

  return (
    <div className="flex flex-col bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
      <span className="text-[11px] font-bold tracking-widest text-[#FF5757] uppercase mb-6">
        Community Wins
      </span>

      <div className="flex flex-col gap-6">
        {MOCK_WINS.map((win, i) => {
          const reaction = reactions[win.id] ?? initialReactionState(win);
          return (
            <div key={win.id} className={`flex gap-4 ${i !== MOCK_WINS.length - 1 ? "border-b border-gray-100 pb-6" : ""}`}>
              <img src={win.userAvatar} alt={win.userName} className="size-10 rounded-full object-cover shrink-0" />
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-[#1F2937]">{win.userName}</span>
                    {win.badge && (
                      <span className="px-2 py-0.5 rounded bg-[#FFE4E4] text-[#FF5757] text-[10px] font-bold uppercase tracking-wider">
                        {win.badge}
                      </span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="text-gray-400 hover:text-gray-600 outline-none">
                      <MoreHorizontal className="size-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleReport(win)}>
                        <Flag className="size-4" />
                        Report post
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleHide(win)}>
                        <EyeOff className="size-4" />
                        Hide this update
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <span className="text-xs text-muted-foreground mb-2">{win.timeAgo}</span>
                <p className="text-sm text-[#4B5563] mb-3 leading-relaxed">{win.content}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleLike(win.id)}
                    className={cn(
                      "flex items-center gap-1.5 transition-colors hover:text-[#FF5757]",
                      reaction.liked && "text-[#FF5757]",
                    )}
                  >
                    <Heart className={cn("size-4", reaction.liked && "fill-current")} /> {reaction.likes}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleComment(win)}
                    className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"
                  >
                    <MessageCircle className="size-4" /> {win.comments}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCelebrate(win.id)}
                    className={cn(
                      "flex items-center gap-1.5 transition-colors hover:text-yellow-500",
                      reaction.celebrated && "text-yellow-500",
                    )}
                  >
                    <PartyPopper className="size-4" /> {reaction.celebrations}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center">
        <Link href="/community" className="flex items-center gap-2 text-sm font-bold text-[#3B82F6] hover:text-blue-700 transition-colors">
          View All Community Wins
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
