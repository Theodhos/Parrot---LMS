import "server-only";
import { prisma } from "@/lib/db/client";
import {
  CommunityPostKind,
  CommunityReactionKind,
  NotificationType,
  Role,
  type Prisma,
} from "@/generated/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors/app-error";
import type { SessionUser } from "@/lib/permissions";
import { removeUploadedMediaFor } from "@/features/media/services/media-cleanup";
import {
  createCommentSchema,
  createPostSchema,
  listPostsSchema,
  type CreatePostInput,
  type ListPostsInput,
} from "@/features/community/schemas/community.schema";
import type {
  CommunityAuthorDTO,
  CommunityCommentDTO,
  CommunityFeedPage,
  CommunityPostDTO,
} from "@/features/community/types/community.types";

/** At most this many posts per member per hour -- enough for real use, not for flooding the feed. */
const POSTS_PER_HOUR = 10;
const COMMENTS_PER_HOUR = 60;
const HOUR_MS = 60 * 60 * 1000;

const isStaff = (role: Role) => role === Role.ADMIN || role === Role.INSTRUCTOR;

const authorSelect = { id: true, name: true, image: true, role: true } as const;

function toAuthor(author: { id: string; name: string; image: string | null; role: Role }): CommunityAuthorDTO {
  return { id: author.id, name: author.name, image: author.image, isStaff: isStaff(author.role) };
}

const postInclude = {
  author: { select: authorSelect },
  reactions: { select: { userId: true, kind: true } },
  reports: { select: { reporterId: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.CommunityPostInclude;

type PostRow = Prisma.CommunityPostGetPayload<{ include: typeof postInclude }>;

function toPostDTO(post: PostRow, viewer: SessionUser): CommunityPostDTO {
  const viewerIsStaff = isStaff(viewer.role);
  const reactions = (kind: CommunityReactionKind) => post.reactions.filter((r) => r.kind === kind);
  return {
    id: post.id,
    kind: post.kind,
    content: post.content,
    videoUrl: post.videoUrl,
    createdAt: post.createdAt.toISOString(),
    author: toAuthor(post.author),
    likeCount: reactions(CommunityReactionKind.LIKE).length,
    celebrateCount: reactions(CommunityReactionKind.CELEBRATE).length,
    commentCount: post._count.comments,
    likedByMe: reactions(CommunityReactionKind.LIKE).some((r) => r.userId === viewer.id),
    celebratedByMe: reactions(CommunityReactionKind.CELEBRATE).some((r) => r.userId === viewer.id),
    reportedByMe: post.reports.some((r) => r.reporterId === viewer.id),
    mine: post.authorId === viewer.id,
    canDelete: post.authorId === viewer.id || viewerIsStaff,
    reportCount: viewerIsStaff ? post.reports.length : 0,
  };
}

/**
 * The feed, newest first, one page at a time. Posts the viewer chose to hide
 * are left out for them only.
 */
export async function listPosts(viewer: SessionUser, input: ListPostsInput = {}): Promise<CommunityFeedPage> {
  const { kind, before, limit } = listPostsSchema.parse(input);

  const rows = await prisma.communityPost.findMany({
    where: {
      ...(kind ? { kind } : {}),
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      hides: { none: { userId: viewer.id } },
    },
    orderBy: { createdAt: "desc" },
    // One extra row tells us whether an older page exists.
    take: limit + 1,
    include: postInclude,
  });

  const page = rows.slice(0, limit);
  return {
    posts: page.map((post) => toPostDTO(post, viewer)),
    nextCursor: rows.length > limit ? page[page.length - 1]!.createdAt.toISOString() : null,
  };
}

async function getPostOrThrow(postId: string) {
  const post = await prisma.communityPost.findUnique({ where: { id: postId }, include: postInclude });
  if (!post) throw new NotFoundError("Post");
  return post;
}

/**
 * Publishes a question, a win or a video post. A video post must point at a
 * file this same member uploaded to the platform's storage -- never at an
 * arbitrary link -- so the feed cannot be used to embed outside content.
 */
export async function createPost(author: SessionUser, input: CreatePostInput): Promise<CommunityPostDTO> {
  const data = createPostSchema.parse(input);

  const recent = await prisma.communityPost.count({
    where: { authorId: author.id, createdAt: { gt: new Date(Date.now() - HOUR_MS) } },
  });
  if (recent >= POSTS_PER_HOUR) {
    throw new ValidationError("You've posted a lot in the last hour. Please try again a little later.");
  }

  let videoUrl: string | null = null;
  if (data.kind === CommunityPostKind.VIDEO) {
    const media = await prisma.media.findFirst({
      where: { userId: author.id, type: "VIDEO", OR: [{ fileUrl: data.videoUrl }, { fileUrl: pathnameOf(data.videoUrl!) }] },
      select: { fileUrl: true },
    });
    if (!media) throw new ValidationError("Upload the video again -- it could not be found");
    videoUrl = media.fileUrl;
  }

  const post = await prisma.communityPost.create({
    data: { authorId: author.id, kind: data.kind, content: data.content, videoUrl },
    include: postInclude,
  });
  return toPostDTO(post, author);
}

/** "/uploads/x.mp4" for a local-disk upload given as an absolute URL; the input itself otherwise. */
function pathnameOf(url: string): string {
  try {
    const { pathname } = new URL(url);
    return pathname.startsWith("/uploads/") ? pathname : url;
  } catch {
    return url;
  }
}

/** The author or any staff member may delete a post; its comments, reactions and uploaded video go with it. */
export async function deletePost(user: SessionUser, postId: string): Promise<void> {
  const post = await getPostOrThrow(postId);
  if (post.authorId !== user.id && !isStaff(user.role)) {
    throw new ForbiddenError("You can only delete your own posts");
  }
  await prisma.communityPost.delete({ where: { id: postId } });
  await removeUploadedMediaFor([post.videoUrl]);
}

/** Adds the reaction if the member has not given it, removes it if they have. Returns the new state. */
export async function toggleReaction(
  user: SessionUser,
  postId: string,
  kind: CommunityReactionKind,
): Promise<{ active: boolean; count: number }> {
  await getPostOrThrow(postId);
  const key = { postId_userId_kind: { postId, userId: user.id, kind } };

  const existing = await prisma.communityReaction.findUnique({ where: key, select: { id: true } });
  if (existing) {
    await prisma.communityReaction.delete({ where: { id: existing.id } });
  } else {
    // upsert, not create: a double click must not fail on the unique index.
    await prisma.communityReaction.upsert({ where: key, create: { postId, userId: user.id, kind }, update: {} });
  }

  const count = await prisma.communityReaction.count({ where: { postId, kind } });
  return { active: !existing, count };
}

function toCommentDTO(
  comment: Prisma.CommunityCommentGetPayload<{ include: { author: { select: typeof authorSelect } } }>,
  viewer: SessionUser,
): CommunityCommentDTO {
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId ?? null,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    author: toAuthor(comment.author),
    canDelete: comment.authorId === viewer.id || isStaff(viewer.role),
  };
}

export async function listComments(viewer: SessionUser, postId: string): Promise<CommunityCommentDTO[]> {
  await getPostOrThrow(postId);
  const comments = await prisma.communityComment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { author: { select: authorSelect } },
  });
  return comments.map((comment) => toCommentDTO(comment, viewer));
}

/**
 * Adds a comment on a post, or a reply to another member's comment, and lets
 * the people being answered know (never the one who is writing).
 */
export async function addComment(
  author: SessionUser,
  input: { postId: string; content: string; parentId?: string },
): Promise<CommunityCommentDTO> {
  const data = createCommentSchema.parse(input);
  const post = await getPostOrThrow(data.postId);

  const parent = data.parentId
    ? await prisma.communityComment.findUnique({ where: { id: data.parentId } })
    : null;
  if (data.parentId && (!parent || parent.postId !== data.postId)) {
    throw new NotFoundError("Comment");
  }
  // Threads are one level deep: a reply to a reply joins the same thread.
  const threadId = parent ? (parent.parentId ?? parent.id) : null;

  const recent = await prisma.communityComment.count({
    where: { authorId: author.id, createdAt: { gt: new Date(Date.now() - HOUR_MS) } },
  });
  if (recent >= COMMENTS_PER_HOUR) {
    throw new ValidationError("You've commented a lot in the last hour. Please try again a little later.");
  }

  const comment = await prisma.communityComment.create({
    data: {
      postId: data.postId,
      authorId: author.id,
      content: data.content,
      ...(threadId ? { parentId: threadId } : {}),
    },
    include: { author: { select: authorSelect } },
  });

  // One notification per person: the member whose comment was answered, and the post's author.
  const notices = new Map<string, string>();
  if (parent) notices.set(parent.authorId, isStaff(author.role) ? "A coach replied to your comment" : "New reply to your comment");
  if (!notices.has(post.authorId)) {
    notices.set(post.authorId, isStaff(author.role) ? "A coach replied to your post" : "New comment on your post");
  }
  notices.delete(author.id);
  if (notices.size > 0) {
    const preview = data.content.length > 120 ? `${data.content.slice(0, 117)}...` : data.content;
    await prisma.notification
      .createMany({
        data: [...notices].map(([userId, title]) => ({
          userId,
          title,
          message: `${author.name}: ${preview}`,
          type: NotificationType.INFO,
        })),
      })
      // A failed notification must not fail the comment.
      .catch(() => undefined);
  }

  return toCommentDTO(comment, author);
}

export async function deleteComment(user: SessionUser, commentId: string): Promise<void> {
  const comment = await prisma.communityComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new NotFoundError("Comment");
  if (comment.authorId !== user.id && !isStaff(user.role)) {
    throw new ForbiddenError("You can only delete your own comments");
  }
  // Replies have no relation to their parent (see schema), so they are removed here.
  await prisma.communityComment.deleteMany({ where: { postId: comment.postId, parentId: commentId } });
  await prisma.communityComment.delete({ where: { id: commentId } });
}

/** Flags a post for staff. Reporting the same post twice is a no-op. */
export async function reportPost(user: SessionUser, postId: string): Promise<void> {
  const post = await getPostOrThrow(postId);
  if (post.authorId === user.id) throw new ValidationError("You can delete your own post instead of reporting it");
  await prisma.communityReport.upsert({
    where: { postId_reporterId: { postId, reporterId: user.id } },
    create: { postId, reporterId: user.id },
    update: {},
  });
}

/** Removes a post from this member's own feed; everyone else still sees it. */
export async function hidePost(user: SessionUser, postId: string): Promise<void> {
  await getPostOrThrow(postId);
  await prisma.communityHide.upsert({
    where: { postId_userId: { postId, userId: user.id } },
    create: { postId, userId: user.id },
    update: {},
  });
}
