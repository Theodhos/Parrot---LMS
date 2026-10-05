"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import {
  EyeOff,
  Flag,
  Heart,
  MessageCircle,
  MessageCircleQuestion,
  MoreHorizontal,
  PartyPopper,
  Reply,
  Send,
  Trash2,
  Trophy,
  Video,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useMounted } from "@/hooks/use-mounted";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  addCommentAction,
  deleteCommentAction,
  deletePostAction,
  hidePostAction,
  listCommentsAction,
  reportPostAction,
  toggleReactionAction,
} from "@/features/community/actions/community.actions";
import type {
  CommunityAuthorDTO,
  CommunityCommentDTO,
  CommunityPostDTO,
} from "@/features/community/types/community.types";
import type { CommunityPostKind } from "@/generated/prisma";

const KIND_BADGE: Record<CommunityPostKind, { label: string; icon: typeof Trophy; className: string }> = {
  QUESTION: { label: "Question", icon: MessageCircleQuestion, className: "bg-[#FFE9E9] text-[#E24C4C]" },
  WIN: { label: "Win", icon: Trophy, className: "bg-[#E3F1FE] text-[#2B7FD0]" },
  VIDEO: { label: "Video", icon: Video, className: "bg-[#EAF6DF] text-[#5C9A2B]" },
};

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function AuthorAvatar({ author, className }: { author: CommunityAuthorDTO; className?: string }) {
  return (
    <Avatar className={cn("size-10 shrink-0", className)}>
      {author.image && <AvatarImage src={author.image} alt={author.name} />}
      <AvatarFallback>{initials(author.name)}</AvatarFallback>
    </Avatar>
  );
}

function CoachBadge() {
  return (
    <span className="rounded bg-[#FFE4E4] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#FF5757] uppercase">
      Coach
    </span>
  );
}

/** "5m ago" depends on the viewer's clock, so it is only rendered in the browser. */
function TimeAgo({ iso }: { iso: string }) {
  const mounted = useMounted();
  return <span className="text-muted-foreground text-xs">{mounted ? formatRelativeTime(iso) : " "}</span>;
}

interface CommentItemProps {
  comment: CommunityCommentDTO;
  disabled: boolean;
  onReply: (comment: CommunityCommentDTO) => void;
  onDelete: (commentId: string) => void;
}

function CommentItem({ comment, disabled, onReply, onDelete }: CommentItemProps) {
  return (
    <div className="flex gap-3">
      <AuthorAvatar author={comment.author} className={comment.parentId ? "size-7" : "size-8"} />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-gray-50 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-[#1F2937]">{comment.author.name}</span>
              {comment.author.isStaff && <CoachBadge />}
              <TimeAgo iso={comment.createdAt} />
            </div>
            {comment.canDelete && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                disabled={disabled}
                className="text-gray-400 hover:text-[#FF5757]"
                aria-label="Delete comment"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
          <p className="text-sm break-words whitespace-pre-line text-[#4B5563]">{comment.content}</p>
        </div>
        <button
          type="button"
          onClick={() => onReply(comment)}
          className="mt-1 ml-3 flex items-center gap-1 text-xs font-semibold text-gray-500 transition-colors hover:text-blue-500"
        >
          <Reply className="size-3.5" />
          Reply
        </button>
      </div>
    </div>
  );
}

export interface PostCardProps {
  post: CommunityPostDTO;
  /** Called after the post is deleted or hidden, so the list can drop it. */
  onRemoved: (postId: string) => void;
  className?: string;
}

/**
 * One community post with everything a member can do to it: like, celebrate,
 * read and write comments, reply to another member's comment, report, hide,
 * and (author or staff) delete.
 * Reactions update at once and are corrected from the server's answer.
 */
export function PostCard({ post, onRemoved, className }: PostCardProps) {
  const [reaction, setReaction] = useState({
    liked: post.likedByMe,
    likes: post.likeCount,
    celebrated: post.celebratedByMe,
    celebrations: post.celebrateCount,
  });
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [comments, setComments] = useState<CommunityCommentDTO[] | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityCommentDTO | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [reported, setReported] = useState(post.reportedByMe);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const badge = KIND_BADGE[post.kind];
  const BadgeIcon = badge.icon;

  function react(kind: "LIKE" | "CELEBRATE") {
    const before = reaction;
    // Optimistic: flip it now, then take the server's count.
    setReaction((r) =>
      kind === "LIKE"
        ? { ...r, liked: !r.liked, likes: r.likes + (r.liked ? -1 : 1) }
        : { ...r, celebrated: !r.celebrated, celebrations: r.celebrations + (r.celebrated ? -1 : 1) },
    );
    startTransition(async () => {
      const result = await toggleReactionAction(post.id, kind);
      if (!result.success) {
        setReaction(before);
        toast.error(result.error);
        return;
      }
      setReaction((r) =>
        kind === "LIKE"
          ? { ...r, liked: result.data.active, likes: result.data.count }
          : { ...r, celebrated: result.data.active, celebrations: result.data.count },
      );
    });
  }

  function toggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments === null) {
      startTransition(async () => {
        const result = await listCommentsAction(post.id);
        if (result.success) {
          setComments(result.data);
          // Others may have replied since the feed was loaded.
          setCommentCount((n) => Math.max(n, result.data.length));
        } else toast.error(result.error);
      });
    }
  }

  function submitComment(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    startTransition(async () => {
      const result = await addCommentAction(post.id, content, replyTo?.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setComments((prev) => [...(prev ?? []), result.data]);
      setCommentCount((n) => n + 1);
      setDraft("");
      setReplyTo(null);
    });
  }

  function startReply(comment: CommunityCommentDTO) {
    setReplyTo(comment);
    composerRef.current?.focus();
  }

  function removeComment(commentId: string) {
    startTransition(async () => {
      const result = await deleteCommentAction(commentId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      // A comment takes its replies with it.
      const gone = (c: CommunityCommentDTO) => c.id === commentId || c.parentId === commentId;
      const removed = (comments ?? []).filter(gone).length || 1;
      setComments((prev) => (prev ?? []).filter((c) => !gone(c)));
      setCommentCount((n) => Math.max(0, n - removed));
      if (replyTo && gone(replyTo)) setReplyTo(null);
    });
  }

  // Replies sit under the comment they answer; one whose parent is not loaded is shown on its own.
  const loadedIds = new Set((comments ?? []).map((c) => c.id));
  const threads = (comments ?? []).filter((c) => !c.parentId || !loadedIds.has(c.parentId));
  const repliesTo = (commentId: string) => (comments ?? []).filter((c) => c.parentId === commentId);

  function report() {
    startTransition(async () => {
      const result = await reportPostAction(post.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setReported(true);
      toast.success("Thanks -- our team will take a look.");
    });
  }

  function hide() {
    startTransition(async () => {
      const result = await hidePostAction(post.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast("Post hidden from your feed.");
      onRemoved(post.id);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deletePostAction(post.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setConfirmDelete(false);
      toast.success("Post deleted.");
      onRemoved(post.id);
    });
  }

  return (
    <article
      id={`post-${post.id}`}
      className={cn("flex scroll-mt-24 gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7", className)}
    >
      <AuthorAvatar author={post.author} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-heading truncate font-semibold text-[#1F2937]">{post.author.name}</span>
            {post.author.isStaff && <CoachBadge />}
            <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", badge.className)}>
              <BadgeIcon className="size-3" />
              {badge.label}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="shrink-0 text-gray-400 outline-none hover:text-gray-600" aria-label="Post options">
              <MoreHorizontal className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!post.mine && (
                <>
                  <DropdownMenuItem onClick={hide}>
                    <EyeOff className="size-4" />
                    Hide this post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={report} disabled={reported}>
                    <Flag className="size-4" />
                    {reported ? "Reported" : "Report post"}
                  </DropdownMenuItem>
                </>
              )}
              {post.canDelete && (
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-4" />
                  Delete post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <TimeAgo iso={post.createdAt} />
          {post.reportCount > 0 && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
              Reported by {post.reportCount}
            </span>
          )}
        </div>

        <p className="mb-3 text-sm leading-relaxed break-words whitespace-pre-line text-[#4B5563]">{post.content}</p>

        {post.videoUrl && (
          <video
            src={post.videoUrl}
            controls
            preload="metadata"
            playsInline
            className="mb-3 aspect-video w-full rounded-2xl bg-black"
          />
        )}

        <div className="flex items-center gap-5 text-sm font-medium text-gray-500">
          <button
            type="button"
            onClick={() => react("LIKE")}
            aria-pressed={reaction.liked}
            aria-label="Like"
            className={cn("flex items-center gap-1.5 transition-colors hover:text-[#FF5757]", reaction.liked && "text-[#FF5757]")}
          >
            <Heart className={cn("size-4", reaction.liked && "fill-current")} /> {reaction.likes}
          </button>
          <button
            type="button"
            onClick={toggleComments}
            aria-expanded={commentsOpen}
            aria-label="Comments"
            className={cn("flex items-center gap-1.5 transition-colors hover:text-blue-500", commentsOpen && "text-blue-500")}
          >
            <MessageCircle className="size-4" />
            {commentCount === 0 ? "Reply" : `${commentCount} ${commentCount === 1 ? "reply" : "replies"}`}
          </button>
          <button
            type="button"
            onClick={() => react("CELEBRATE")}
            aria-pressed={reaction.celebrated}
            aria-label="Celebrate"
            className={cn("flex items-center gap-1.5 transition-colors hover:text-yellow-500", reaction.celebrated && "text-yellow-500")}
          >
            <PartyPopper className="size-4" /> {reaction.celebrations}
          </button>
        </div>

        {commentsOpen && (
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4">
            {comments === null ? (
              <p className="text-muted-foreground text-xs">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-muted-foreground text-xs">No comments yet. Be the first to reply.</p>
            ) : (
              threads.map((comment) => (
                <div key={comment.id} className="flex flex-col gap-2">
                  <CommentItem comment={comment} disabled={pending} onReply={startReply} onDelete={removeComment} />
                  {repliesTo(comment.id).length > 0 && (
                    <div className="ml-4 flex flex-col gap-2 border-l-2 border-gray-100 pl-3 sm:ml-11">
                      {repliesTo(comment.id).map((reply) => (
                        <CommentItem
                          key={reply.id}
                          comment={reply}
                          disabled={pending}
                          onReply={startReply}
                          onDelete={removeComment}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}

            {replyTo && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                <span className="min-w-0 truncate">
                  Replying to <span className="font-bold">{replyTo.author.name}</span>
                </span>
                <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="shrink-0 hover:text-blue-900">
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={submitComment} className="flex items-end gap-2">
              <Textarea
                ref={composerRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) submitComment(e);
                }}
                rows={1}
                maxLength={1000}
                placeholder={replyTo ? `Reply to ${replyTo.author.name}...` : "Write a reply..."}
                className="min-h-9 flex-1 resize-none"
              />
              <button
                type="submit"
                disabled={pending || draft.trim().length === 0}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
                aria-label="Send comment"
              >
                <Send className="size-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              The post, its comments and its video are removed for everyone. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={remove}>
              {pending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
