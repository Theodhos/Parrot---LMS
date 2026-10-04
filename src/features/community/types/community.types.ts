import type { CommunityPostKind } from "@/generated/prisma";

export interface CommunityAuthorDTO {
  id: string;
  name: string;
  image: string | null;
  /** Admins and instructors: shown with a "Coach" badge so members can tell official answers apart. */
  isStaff: boolean;
}

export interface CommunityPostDTO {
  id: string;
  kind: CommunityPostKind;
  content: string;
  videoUrl: string | null;
  /** ISO timestamp; formatted in the viewer's own time zone on the client. */
  createdAt: string;
  author: CommunityAuthorDTO;
  likeCount: number;
  celebrateCount: number;
  commentCount: number;
  likedByMe: boolean;
  celebratedByMe: boolean;
  reportedByMe: boolean;
  /** The viewer wrote this post (so they cannot report or hide it -- they can delete it). */
  mine: boolean;
  /** The viewer wrote it, or is staff. */
  canDelete: boolean;
  /** How many members reported it. Only filled in for staff; 0 for everyone else. */
  reportCount: number;
}

export interface CommunityCommentDTO {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: CommunityAuthorDTO;
  canDelete: boolean;
}

export interface CommunityFeedPage {
  posts: CommunityPostDTO[];
  /** Pass back as `before` to load the next, older page; null when there is nothing older. */
  nextCursor: string | null;
}
