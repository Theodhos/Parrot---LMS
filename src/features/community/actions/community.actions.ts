"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { postIdSchema, reactionSchema } from "@/features/community/schemas/community.schema";
import * as community from "@/features/community/services/community.service";
import type {
  CommunityCommentDTO,
  CommunityFeedPage,
  CommunityPostDTO,
} from "@/features/community/types/community.types";
import type { CommunityPostKind, CommunityReactionKind } from "@/generated/prisma";

export type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

/**
 * Runs a community operation for the signed-in user and turns any failure
 * into a message the UI can show -- a thrown Server Action error would reach
 * the browser redacted in production.
 */
async function run<T>(operation: (user: Awaited<ReturnType<typeof requireCurrentUser>>) => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await operation(await requireCurrentUser()) };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: error.issues[0]?.message ?? "Invalid input" };
    if (error instanceof AppError) return { success: false, error: error.message };
    console.error(`[community] ${error instanceof Error ? error.message : error}`);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/** The dashboard shows the latest wins, so anything that changes the feed refreshes it too. */
function refresh() {
  revalidatePath("/community");
  revalidatePath("/dashboard");
}

export async function loadPostsAction(input: {
  kind?: CommunityPostKind;
  before?: string;
}): Promise<ActionResult<CommunityFeedPage>> {
  return run((user) => community.listPosts(user, input));
}

export async function createPostAction(input: {
  kind: CommunityPostKind;
  content: string;
  videoUrl?: string;
}): Promise<ActionResult<CommunityPostDTO>> {
  const result = await run((user) => community.createPost(user, input));
  if (result.success) refresh();
  return result;
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  const result = await run(async (user) => {
    await community.deletePost(user, postIdSchema.parse(postId));
    return undefined;
  });
  if (result.success) refresh();
  return result;
}

export async function toggleReactionAction(
  postId: string,
  kind: CommunityReactionKind,
): Promise<ActionResult<{ active: boolean; count: number }>> {
  return run((user) => {
    const input = reactionSchema.parse({ postId, kind });
    return community.toggleReaction(user, input.postId, input.kind);
  });
}

export async function listCommentsAction(postId: string): Promise<ActionResult<CommunityCommentDTO[]>> {
  return run((user) => community.listComments(user, postIdSchema.parse(postId)));
}

export async function addCommentAction(
  postId: string,
  content: string,
  parentId?: string,
): Promise<ActionResult<CommunityCommentDTO>> {
  return run((user) => community.addComment(user, { postId, content, parentId }));
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  return run(async (user) => {
    await community.deleteComment(user, postIdSchema.parse(commentId));
    return undefined;
  });
}

export async function reportPostAction(postId: string): Promise<ActionResult> {
  return run(async (user) => {
    await community.reportPost(user, postIdSchema.parse(postId));
    return undefined;
  });
}

export async function hidePostAction(postId: string): Promise<ActionResult> {
  const result = await run(async (user) => {
    await community.hidePost(user, postIdSchema.parse(postId));
    return undefined;
  });
  if (result.success) refresh();
  return result;
}
