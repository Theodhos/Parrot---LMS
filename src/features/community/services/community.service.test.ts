import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { CommunityPostKind, CommunityReactionKind, Role } from "@/generated/prisma";
import { ForbiddenError, ValidationError } from "@/lib/errors/app-error";
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  hidePost,
  listComments,
  listPosts,
  reportPost,
  toggleReaction,
} from "./community.service";

describe("community.service (local MongoDB-backed)", () => {
  const stamp = Date.now();
  const ids = { alice: "", bob: "", coach: "" };
  const session = (id: string, role: Role = Role.STUDENT, name = "Member") =>
    ({ id, role, name, email: "", wordpressUserId: null }) as never;
  const alice = () => session(ids.alice, Role.STUDENT, "Alice");
  const bob = () => session(ids.bob, Role.STUDENT, "Bob");
  const coach = () => session(ids.coach, Role.INSTRUCTOR, "Coach");
  // The feed is shared with whatever real posts exist; look only at this test's own.
  const mine = async (viewer: never) =>
    (await listPosts(viewer, { limit: 50 })).posts.filter((p) => Object.values(ids).includes(p.author.id));

  let questionId: string;
  const videoFile = `/uploads/community-test-${stamp}.mp4`;

  beforeAll(async () => {
    const create = (label: string, role: Role) =>
      prisma.user.create({ data: { name: label, email: `community-${label}-${stamp}@test.local`, role } });
    ids.alice = (await create("alice", Role.STUDENT)).id;
    ids.bob = (await create("bob", Role.STUDENT)).id;
    ids.coach = (await create("coach", Role.INSTRUCTOR)).id;
  });

  afterAll(async () => {
    await prisma.media.deleteMany({ where: { fileUrl: videoFile } });
    // Posts, comments, reactions, reports, hides and notifications all cascade from the users.
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  });

  it("publishes a question and a win, newest first, with the author's name", async () => {
    questionId = (await createPost(alice(), { kind: CommunityPostKind.QUESTION, content: "  How long until the first word?  " })).id;
    await createPost(bob(), { kind: CommunityPostKind.WIN, content: "Kiwi said hello!" });

    const posts = await mine(alice());
    expect(posts.map((p) => [p.kind, p.content, p.author.name])).toEqual([
      ["WIN", "Kiwi said hello!", "bob"],
      ["QUESTION", "How long until the first word?", "alice"],
    ]);
    expect((await listPosts(alice(), { kind: CommunityPostKind.WIN, limit: 50 })).posts.every((p) => p.kind === "WIN")).toBe(true);
  });

  it("rejects an empty post, and a video post without an uploaded video", async () => {
    await expect(createPost(alice(), { kind: CommunityPostKind.WIN, content: "   " })).rejects.toThrow();
    await expect(createPost(alice(), { kind: CommunityPostKind.VIDEO, content: "Please review" })).rejects.toThrow();
    // A link to somewhere else is not an upload.
    await expect(
      createPost(alice(), { kind: CommunityPostKind.VIDEO, content: "Please review", videoUrl: "https://evil.example/x.mp4" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("accepts a video post only for a video the same member uploaded", async () => {
    await prisma.media.create({
      data: { userId: ids.alice, fileName: "clip.mp4", fileUrl: videoFile, type: "VIDEO", size: 10 },
    });

    await expect(
      createPost(bob(), { kind: CommunityPostKind.VIDEO, content: "Not mine", videoUrl: videoFile }),
    ).rejects.toBeInstanceOf(ValidationError);

    const post = await createPost(alice(), {
      kind: CommunityPostKind.VIDEO,
      content: "Feedback please",
      videoUrl: `http://localhost:3010${videoFile}`,
    });
    expect(post.videoUrl).toBe(videoFile);
  });

  it("toggles likes and celebrations per member and counts them", async () => {
    expect(await toggleReaction(bob(), questionId, CommunityReactionKind.LIKE)).toEqual({ active: true, count: 1 });
    expect(await toggleReaction(coach(), questionId, CommunityReactionKind.LIKE)).toEqual({ active: true, count: 2 });
    expect(await toggleReaction(bob(), questionId, CommunityReactionKind.CELEBRATE)).toEqual({ active: true, count: 1 });
    expect(await toggleReaction(bob(), questionId, CommunityReactionKind.LIKE)).toEqual({ active: false, count: 1 });

    const forBob = (await mine(bob())).find((p) => p.id === questionId)!;
    expect(forBob).toMatchObject({ likeCount: 1, celebrateCount: 1, likedByMe: false, celebratedByMe: true });
    expect((await mine(coach())).find((p) => p.id === questionId)!.likedByMe).toBe(true);
  });

  it("adds comments, marks a coach's answer, and notifies the post's author", async () => {
    await addComment(coach(), { postId: questionId, content: "Usually two to four weeks of daily practice." });
    await addComment(alice(), { postId: questionId, content: "Thank you!" });

    const comments = await listComments(bob(), questionId);
    expect(comments.map((c) => [c.author.name, c.author.isStaff, c.canDelete])).toEqual([
      ["coach", true, false],
      ["alice", false, false],
    ]);
    expect((await mine(alice())).find((p) => p.id === questionId)!.commentCount).toBe(2);

    // Alice hears about the coach's answer, but not about her own reply.
    const notifications = await prisma.notification.findMany({ where: { userId: ids.alice } });
    expect(notifications.map((n) => n.title)).toEqual(["A coach replied to your post"]);
    expect(notifications[0]!.message).toContain("Coach: Usually two to four weeks");
  });

  it("lets a member delete only their own comment, and staff delete any", async () => {
    const [coachComment, aliceComment] = await listComments(alice(), questionId);
    await expect(deleteComment(bob(), aliceComment!.id)).rejects.toBeInstanceOf(ForbiddenError);
    await deleteComment(alice(), aliceComment!.id);
    await deleteComment(coach(), coachComment!.id);
    expect(await listComments(alice(), questionId)).toEqual([]);
  });

  it("hides a post for one member only, and shows report counts to staff only", async () => {
    await reportPost(bob(), questionId);
    await reportPost(bob(), questionId);
    await expect(reportPost(alice(), questionId)).rejects.toBeInstanceOf(ValidationError);

    expect((await mine(coach())).find((p) => p.id === questionId)!.reportCount).toBe(1);
    const forBob = (await mine(bob())).find((p) => p.id === questionId)!;
    expect(forBob).toMatchObject({ reportCount: 0, reportedByMe: true });

    await hidePost(bob(), questionId);
    expect((await mine(bob())).some((p) => p.id === questionId)).toBe(false);
    expect((await mine(alice())).some((p) => p.id === questionId)).toBe(true);
  });

  it("lets only the author or staff delete a post, and removes its uploaded video", async () => {
    const videoPost = (await mine(alice())).find((p) => p.kind === "VIDEO")!;
    expect(videoPost.canDelete).toBe(true);
    expect((await mine(bob())).find((p) => p.id === videoPost.id)!.canDelete).toBe(false);

    await expect(deletePost(bob(), videoPost.id)).rejects.toBeInstanceOf(ForbiddenError);
    await deletePost(alice(), videoPost.id);
    expect(await prisma.media.count({ where: { fileUrl: videoFile } })).toBe(0);

    await deletePost(coach(), questionId);
    expect((await mine(alice())).map((p) => p.kind)).toEqual(["WIN"]);
  });

  it("pages through the feed with a cursor", async () => {
    const first = await listPosts(alice(), { limit: 1 });
    expect(first.posts).toHaveLength(1);
    if (first.nextCursor) {
      const second = await listPosts(alice(), { limit: 1, before: first.nextCursor });
      expect(second.posts[0]?.id).not.toBe(first.posts[0]!.id);
    }
  });
});
