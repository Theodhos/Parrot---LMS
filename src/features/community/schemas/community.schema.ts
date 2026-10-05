import { z } from "zod";
import { CommunityPostKind, CommunityReactionKind } from "@/generated/prisma";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid id");

export const createPostSchema = z
  .object({
    kind: z.enum(CommunityPostKind),
    content: z.string().trim().min(1, "Write something first").max(2000, "Keep it under 2000 characters"),
    /** Required for a VIDEO post: the URL returned by the uploader for a file this member uploaded. */
    videoUrl: z.string().trim().max(2000).optional(),
  })
  .refine((post) => post.kind !== CommunityPostKind.VIDEO || Boolean(post.videoUrl), {
    message: "Choose a video to upload",
    path: ["videoUrl"],
  })
  .refine((post) => post.kind === CommunityPostKind.VIDEO || !post.videoUrl, {
    message: "Only a video post can carry a video",
    path: ["videoUrl"],
  });
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const listPostsSchema = z.object({
  kind: z.enum(CommunityPostKind).optional(),
  /** ISO timestamp of the oldest post already shown. */
  before: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(50).default(15),
});
export type ListPostsInput = z.input<typeof listPostsSchema>;

export const createCommentSchema = z.object({
  postId: objectId,
  /** The comment being answered, when this is a reply to another member rather than to the post. */
  parentId: objectId.optional(),
  content: z.string().trim().min(1, "Write a comment first").max(1000, "Keep it under 1000 characters"),
});

export const reactionSchema = z.object({ postId: objectId, kind: z.enum(CommunityReactionKind) });
export const postIdSchema = objectId;
