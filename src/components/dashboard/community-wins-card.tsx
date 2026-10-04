"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PostCard } from "@/components/community/post-card";
import type { CommunityPostDTO } from "@/features/community/types/community.types";

/** The latest wins from the community, with the same like / celebrate / comment actions as the full feed. */
export function CommunityWinsCard({ posts: initialPosts }: { posts: CommunityPostDTO[] }) {
  const [posts, setPosts] = useState(initialPosts);

  return (
    <div className="flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
      <span className="mb-6 text-[11px] font-bold tracking-widest text-[#FF5757] uppercase">Community Wins</span>

      {posts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No wins shared yet.{" "}
          <Link href="/community?compose=win" className="font-semibold text-[#3B82F6] hover:underline">
            Share the first one
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col">
          {posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              onRemoved={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
              className={`rounded-none border-0 !p-0 shadow-none ${index === posts.length - 1 ? "" : "mb-6 border-b border-gray-100 !pb-6"}`}
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-center border-t border-gray-100 pt-4">
        <Link
          href="/community"
          className="flex items-center gap-2 text-sm font-bold text-[#3B82F6] transition-colors hover:text-blue-700"
        >
          View All Community Wins
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
