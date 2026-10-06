import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { CourseStatus, EnrollmentStatus, Role } from "@/generated/prisma";
import { ConflictError, ForbiddenError, ValidationError } from "@/lib/errors/app-error";
import { claimInvitedAccount, getInviteEmailStatus } from "@/features/auth/services/activation.service";
import { verifyCredentials } from "@/features/auth/services/auth.service";
import { listCourses } from "@/features/courses/services/course.service";
import { listCoursesQuerySchema } from "@/features/courses/schemas/course.schema";
import { enrollInCourse } from "@/features/enrollments/services/enrollment.service";
import { getAccessibleEnrollment } from "./access.service";
import { hasAllCourseAccess } from "./all-access";
import { getUserCourseAccess, setUserCourseAccess } from "./course-access.service";
import { handleMemberSignup, toUsername } from "./member-signup.service";

describe("toUsername", () => {
  it("keeps a valid username and tidies anything else into one", () => {
    expect(toUsername("jen_parrot-01")).toBe("jen_parrot-01");
    expect(toUsername("  Jen Taylor  ")).toBe("jen.taylor");
    expect(toUsername("Zoë O'Connor")).toBe("zoe.oconnor");
    expect(toUsername("someone@example.com")).toBe("someone");
    expect(toUsername("x".repeat(50))).toHaveLength(30);
  });
});

describe("free members from the GoHighLevel contact webhook (local MongoDB-backed)", () => {
  const stamp = Date.now();
  const email = `member-${stamp}@test.local`;
  const otherEmail = `member-other-${stamp}@test.local`;
  const username = `member.${stamp}`;
  const courseIds: string[] = [];
  let instructorId: string;
  let freeCourseId: string;
  let paidCourseId: string;

  const admin = { id: "000000000000000000000000", role: Role.ADMIN } as never;
  const asStudent = (id: string) => ({ id, role: Role.STUDENT }) as never;
  const memberId = async () => (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
  const visibleCourseIds = async (scope: Parameters<typeof listCourses>[1]) =>
    (await listCourses(listCoursesQuerySchema.parse({ status: CourseStatus.PUBLISHED, pageSize: 50 }), scope)).items
      .map((course) => course.id)
      .filter((id) => courseIds.includes(id));

  beforeAll(async () => {
    const instructor = await prisma.user.create({
      data: { name: "Instructor", email: `member-instructor-${stamp}@test.local`, role: Role.INSTRUCTOR },
    });
    instructorId = instructor.id;
    for (const [label, priceCents] of [["free", 0], ["paid", 4900]] as const) {
      const course = await prisma.course.create({
        data: {
          title: `Member Test ${label}`,
          slug: `member-test-${label}-${stamp}`,
          description: "test",
          instructorId,
          status: CourseStatus.PUBLISHED,
          priceCents,
        },
      });
      courseIds.push(course.id);
    }
    [freeCourseId, paidCourseId] = courseIds as [string, string];
  }, 60_000);

  afterAll(async () => {
    // Members first (their enrollments go with them), then the courses, then the instructor the courses required.
    await prisma.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    await prisma.user.deleteMany({ where: { id: instructorId } });
  });

  it("stores the contact's email and username, with no password and no purchase", async () => {
    expect(await getInviteEmailStatus(email)).toBe("not-on-record");

    const result = await handleMemberSignup({ email, name: "Free Member", username });

    expect(result).toEqual({ newAccount: true, username, needsPassword: true });
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user).toMatchObject({ username, name: "Free Member", role: Role.STUDENT, password: null });
    expect(user.invitedAt).toBeInstanceOf(Date);
    expect(await hasAllCourseAccess(user.id)).toBe(false);
    expect(await getInviteEmailStatus(email)).toBe("ready");
  });

  it("follows GoHighLevel's username until a password exists, and never hands out one that is taken", async () => {
    const renamed = await handleMemberSignup({ email, username: `renamed ${stamp}` });
    expect(renamed).toEqual({ newAccount: false, username: `renamed.${stamp}`, needsPassword: true });
    expect(await prisma.user.count({ where: { email } })).toBe(1);

    // Back to the original; someone else then asks for the same name.
    await handleMemberSignup({ email, username });
    const other = await handleMemberSignup({ email: otherEmail, username });
    expect(other.username).toBe(`${username}-2`);
  });

  it("opens the free course but not the paid one, which the library does not even list", async () => {
    const id = await memberId();

    expect(await visibleCourseIds({ freeOnly: true })).toEqual([freeCourseId]);
    expect(await visibleCourseIds({ freeOrCourseIds: [] })).toEqual([freeCourseId]);

    expect((await enrollInCourse(asStudent(id), freeCourseId)).status).toBe(EnrollmentStatus.ACTIVE);
    await expect(enrollInCourse(asStudent(id), paidCourseId)).rejects.toBeInstanceOf(ForbiddenError);
    expect(await getAccessibleEnrollment({ id }, paidCourseId)).toBeNull();
  });

  it("opens a paid course once an admin assigns it, and closes it when taken away", async () => {
    const id = await memberId();
    await expect(setUserCourseAccess(asStudent(id), id, paidCourseId, true)).rejects.toBeInstanceOf(ForbiddenError);

    await setUserCourseAccess(admin, id, paidCourseId, true);

    expect((await getAccessibleEnrollment({ id }, paidCourseId))?.status).toBe(EnrollmentStatus.ACTIVE);
    expect((await visibleCourseIds({ freeOrCourseIds: [paidCourseId] })).sort()).toEqual([freeCourseId, paidCourseId].sort());
    const access = await getUserCourseAccess(admin, id);
    expect(access.buyer).toBe(false);
    expect(access.courses.find((course) => course.id === paidCourseId)?.assigned).toBe(true);

    await setUserCourseAccess(admin, id, paidCourseId, false);

    expect(await getAccessibleEnrollment({ id }, paidCourseId)).toBeNull();
    const after = await getUserCourseAccess(admin, id);
    expect(after.courses.find((course) => course.id === paidCourseId)?.assigned).toBe(false);
  });

  it("lets the member create only a password, once, and sign in with the stored username", async () => {
    expect(await claimInvitedAccount(`nobody-${stamp}@test.local`, "Password123")).toEqual({ status: "not-on-record" });

    expect(await claimInvitedAccount(email, "Password123")).toEqual({ status: "claimed", email });

    expect((await verifyCredentials(username, "Password123")).email).toBe(email);
    expect((await verifyCredentials(email, "Password123")).email).toBe(email);
    expect(await getInviteEmailStatus(email)).toBe("already-set-up");
    await expect(claimInvitedAccount(email, "Hijacked123")).rejects.toBeInstanceOf(ConflictError);

    // From here on GoHighLevel can no longer change the account.
    const again = await handleMemberSignup({ email, username: `someone-else-${stamp}` });
    expect(again).toEqual({ newAccount: false, username, needsPassword: false });
    expect((await verifyCredentials(username, "Password123")).email).toBe(email);
  });

  it("refuses a registration older than 7 days, and an account GoHighLevel never registered", async () => {
    await prisma.user.update({
      where: { email: otherEmail },
      data: { invitedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    });
    expect(await getInviteEmailStatus(otherEmail)).toBe("expired");
    await expect(claimInvitedAccount(otherEmail, "Password123")).rejects.toBeInstanceOf(ValidationError);

    // The instructor has no password either, but was not registered by the webhook.
    expect(await getInviteEmailStatus(`member-instructor-${stamp}@test.local`)).toBe("not-on-record");
  });
});
