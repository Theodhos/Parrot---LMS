import {
  PrismaClient,
  Role,
  CourseStatus,
  CourseLevel,
  LessonType,
  EnrollmentStatus,
  QuestionType,
  ActivityType,
  NotificationType,
} from "../src/generated/prisma";

const prisma = new PrismaClient();

// Matches the WordPress users created for the local course-platform-bridge
// test site (see the WordPress setup notes in the README) -- identity and
// passwords live there now, never here.
const WP_USER_IDS = {
  admin: 2,
  instructor: 3,
  priya: 4,
  alice: 5,
  bob: 6,
  carol: 7,
} as const;

async function main() {
  console.log("Seeding database...");

  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.learningActivity.deleteMany(),
    prisma.quizAttempt.deleteMany(),
    prisma.answer.deleteMany(),
    prisma.question.deleteMany(),
    prisma.quiz.deleteMany(),
    prisma.courseRating.deleteMany(),
    prisma.progress.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.module.deleteMany(),
    prisma.course.deleteMany(),
    prisma.courseCategory.deleteMany(),
    prisma.media.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const [, instructor, instructor2, alice, bob, carol] = await Promise.all([
    prisma.user.create({
      data: { name: "Ada Admin", email: "admin@parrot.dev", role: Role.ADMIN, wordpressUserId: WP_USER_IDS.admin },
    }),
    prisma.user.create({
      data: {
        name: "Ian Instructor",
        email: "instructor@parrot.dev",
        role: Role.INSTRUCTOR,
        wordpressUserId: WP_USER_IDS.instructor,
        bio: "Backend engineer teaching Java and system design for 10+ years.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Priya Patel",
        email: "priya@parrot.dev",
        role: Role.INSTRUCTOR,
        wordpressUserId: WP_USER_IDS.priya,
        bio: "Frontend architect and design systems lead.",
      },
    }),
    prisma.user.create({
      data: { name: "Alice Student", email: "alice@parrot.dev", role: Role.STUDENT, wordpressUserId: WP_USER_IDS.alice },
    }),
    prisma.user.create({
      data: { name: "Bob Student", email: "bob@parrot.dev", role: Role.STUDENT, wordpressUserId: WP_USER_IDS.bob },
    }),
    prisma.user.create({
      data: { name: "Carol Student", email: "carol@parrot.dev", role: Role.STUDENT, wordpressUserId: WP_USER_IDS.carol },
    }),
  ]);

  const [catProgramming, catWeb, catData] = await Promise.all([
    prisma.courseCategory.create({ data: { name: "Programming", slug: "programming" } }),
    prisma.courseCategory.create({ data: { name: "Web Development", slug: "web-development" } }),
    prisma.courseCategory.create({ data: { name: "Data Science", slug: "data-science" } }),
  ]);

  // ---------------------------------------------------------------------
  // Course 1: Java Programming (the spec's worked example)
  // ---------------------------------------------------------------------
  const java = await prisma.course.create({
    data: {
      title: "Java Programming",
      slug: "java-programming",
      description:
        "Learn Java from the ground up: syntax, object-oriented programming, collections, streams and multithreading.",
      thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      instructorId: instructor.id,
      categoryId: catProgramming.id,
    },
  });

  const javaModules = [
    {
      title: "Introduction",
      description: "Get Java installed and write your first program.",
      lessons: [
        { title: "What is Java?", type: LessonType.ARTICLE, duration: 420 },
        { title: "Installing Java", type: LessonType.ARTICLE, duration: 360 },
        { title: "First Java Program", type: LessonType.VIDEO, duration: 600, videoUrl: "https://www.youtube.com/watch?v=eIrMbAQSU34" },
      ],
    },
    {
      title: "OOP",
      description: "Core object-oriented programming concepts in Java.",
      lessons: [
        { title: "Classes", type: LessonType.ARTICLE, duration: 540 },
        { title: "Objects", type: LessonType.ARTICLE, duration: 480 },
        { title: "Inheritance", type: LessonType.VIDEO, duration: 720, videoUrl: "https://www.youtube.com/watch?v=9JpNY-XAseg" },
        { title: "Polymorphism", type: LessonType.QUIZ, duration: 300 },
      ],
    },
    {
      title: "Advanced Java",
      description: "Collections, streams and concurrency.",
      lessons: [
        { title: "Collections", type: LessonType.ARTICLE, duration: 660 },
        { title: "Streams", type: LessonType.VIDEO, duration: 780, videoUrl: "https://www.youtube.com/watch?v=Q93JsQ8vcwI" },
        { title: "Multithreading", type: LessonType.DOCUMENT, duration: 900 },
      ],
    },
  ];

  let javaQuizLessonId: string | null = null;
  let javaFirstLessonId = "";

  for (let mi = 0; mi < javaModules.length; mi++) {
    const mod = javaModules[mi]!;
    const moduleRecord = await prisma.module.create({
      data: { title: mod.title, description: mod.description, order: mi, courseId: java.id },
    });

    for (let li = 0; li < mod.lessons.length; li++) {
      const lesson = mod.lessons[li]!;
      const created = await prisma.lesson.create({
        data: {
          title: lesson.title,
          slug: lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          description: `${lesson.title} — part of ${mod.title}.`,
          content:
            lesson.type === LessonType.ARTICLE || lesson.type === LessonType.DOCUMENT
              ? `<h2>${lesson.title}</h2><p>This lesson covers <strong>${lesson.title}</strong> in depth with examples and exercises.</p><ul><li>Key concept one</li><li>Key concept two</li><li>Key concept three</li></ul>`
              : null,
          videoUrl: "videoUrl" in lesson ? lesson.videoUrl : null,
          duration: lesson.duration,
          order: li,
          type: lesson.type,
          published: true,
          moduleId: moduleRecord.id,
          courseId: java.id,
        },
      });
      if (mi === 0 && li === 0) javaFirstLessonId = created.id;
      if (lesson.type === LessonType.QUIZ) javaQuizLessonId = created.id;
    }
  }

  if (javaQuizLessonId) {
    await prisma.quiz.create({
      data: {
        title: "Polymorphism Check",
        lessonId: javaQuizLessonId,
        questions: {
          create: [
            {
              question: "What is method overriding?",
              type: QuestionType.SINGLE_CHOICE,
              order: 0,
              answers: {
                create: [
                  { answer: "Redefining a parent method in a subclass", isCorrect: true, order: 0 },
                  { answer: "Declaring two methods with the same name in one class", isCorrect: false, order: 1 },
                  { answer: "Calling a method twice", isCorrect: false, order: 2 },
                ],
              },
            },
            {
              question: "Which of these enable polymorphism in Java?",
              type: QuestionType.MULTIPLE_CHOICE,
              order: 1,
              answers: {
                create: [
                  { answer: "Method overriding", isCorrect: true, order: 0 },
                  { answer: "Interfaces", isCorrect: true, order: 1 },
                  { answer: "Static fields", isCorrect: false, order: 2 },
                ],
              },
            },
            {
              question: "Java supports multiple inheritance of classes.",
              type: QuestionType.TRUE_FALSE,
              order: 2,
              answers: {
                create: [
                  { answer: "True", isCorrect: false, order: 0 },
                  { answer: "False", isCorrect: true, order: 1 },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // ---------------------------------------------------------------------
  // Course 2: Modern Web Development (Priya) — published, second category
  // ---------------------------------------------------------------------
  const web = await prisma.course.create({
    data: {
      title: "Modern Web Development",
      slug: "modern-web-development",
      description: "Build production-grade web apps with React, TypeScript and modern tooling.",
      thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      instructorId: instructor2.id,
      categoryId: catWeb.id,
    },
  });

  const webModules = [
    { title: "Foundations", lessons: ["HTML & Semantics", "Modern CSS", "TypeScript Basics"] },
    { title: "React Essentials", lessons: ["Components & Props", "State & Effects", "Data Fetching"] },
  ];

  let webFirstLessonId = "";
  for (let mi = 0; mi < webModules.length; mi++) {
    const mod = webModules[mi]!;
    const moduleRecord = await prisma.module.create({
      data: { title: mod.title, order: mi, courseId: web.id },
    });
    for (let li = 0; li < mod.lessons.length; li++) {
      const title = mod.lessons[li]!;
      const created = await prisma.lesson.create({
        data: {
          title,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          content: `<h2>${title}</h2><p>Hands-on lesson content for ${title}.</p>`,
          duration: 480 + li * 60,
          order: li,
          type: LessonType.ARTICLE,
          published: true,
          moduleId: moduleRecord.id,
          courseId: web.id,
        },
      });
      if (mi === 0 && li === 0) webFirstLessonId = created.id;
    }
  }

  // ---------------------------------------------------------------------
  // Course 3: Data Science Fundamentals — draft, shows in admin only
  // ---------------------------------------------------------------------
  const dataCourse = await prisma.course.create({
    data: {
      title: "Data Science Fundamentals",
      slug: "data-science-fundamentals",
      description: "An introduction to statistics, Python and data visualization for aspiring data scientists.",
      level: CourseLevel.BEGINNER,
      status: CourseStatus.DRAFT,
      instructorId: instructor.id,
      categoryId: catData.id,
    },
  });
  const dsModule = await prisma.module.create({ data: { title: "Getting Started", order: 0, courseId: dataCourse.id } });
  await prisma.lesson.create({
    data: {
      title: "Why Data Science?",
      slug: "why-data-science",
      content: "<h2>Why Data Science?</h2><p>Coming soon.</p>",
      duration: 300,
      order: 0,
      type: LessonType.ARTICLE,
      published: false,
      moduleId: dsModule.id,
      courseId: dataCourse.id,
    },
  });

  // ---------------------------------------------------------------------
  // WooCommerce purchase-access cache -- mirrors the orders created against
  // the local course-platform-bridge WordPress test site (products 11/12,
  // orders 13/15/16/17; see the WordPress setup notes). Seeding this
  // directly keeps demo data self-consistent even if you reset MongoDB
  // without touching WordPress.
  // ---------------------------------------------------------------------
  await prisma.courseAccess.createMany({
    data: [
      { wordpressUserId: WP_USER_IDS.alice, courseId: java.id, courseSlug: java.slug, woocommerceProductId: 11, woocommerceOrderId: 13 },
      { wordpressUserId: WP_USER_IDS.alice, courseId: web.id, courseSlug: web.slug, woocommerceProductId: 12, woocommerceOrderId: 15 },
      { wordpressUserId: WP_USER_IDS.bob, courseId: java.id, courseSlug: java.slug, woocommerceProductId: 11, woocommerceOrderId: 16 },
      { wordpressUserId: WP_USER_IDS.carol, courseId: web.id, courseSlug: web.slug, woocommerceProductId: 12, woocommerceOrderId: 17 },
    ],
  });

  // ---------------------------------------------------------------------
  // Enrollments + progress
  // ---------------------------------------------------------------------
  const javaLessons = await prisma.lesson.findMany({ where: { courseId: java.id }, orderBy: { order: "asc" } });
  const webLessons = await prisma.lesson.findMany({ where: { courseId: web.id }, orderBy: { order: "asc" } });

  await prisma.enrollment.create({ data: { userId: alice.id, courseId: java.id, status: EnrollmentStatus.ACTIVE, progressPercent: 0, lastAccessedAt: new Date() } });
  await prisma.enrollment.create({ data: { userId: alice.id, courseId: web.id, status: EnrollmentStatus.ACTIVE, progressPercent: 0, lastAccessedAt: new Date() } });
  await prisma.enrollment.create({ data: { userId: bob.id, courseId: java.id, status: EnrollmentStatus.ACTIVE, progressPercent: 0, lastAccessedAt: new Date() } });
  await prisma.enrollment.create({ data: { userId: carol.id, courseId: web.id, status: EnrollmentStatus.ACTIVE, progressPercent: 0, lastAccessedAt: new Date() } });

  async function completeLessons(userId: string, courseId: string, lessons: { id: string }[], count: number, daysAgoStart: number) {
    const toComplete = lessons.slice(0, count);
    for (let i = 0; i < toComplete.length; i++) {
      const completedAt = new Date(Date.now() - (daysAgoStart - i) * 24 * 60 * 60 * 1000);
      await prisma.progress.create({
        data: {
          userId,
          courseId,
          lessonId: toComplete[i]!.id,
          completed: true,
          progressPercent: 100,
          startedAt: completedAt,
          completedAt,
          updatedAt: completedAt,
        },
      });
      await prisma.learningActivity.create({
        data: { userId, courseId, lessonId: toComplete[i]!.id, type: ActivityType.LESSON_COMPLETED, minutesSpent: 8, occurredAt: completedAt },
      });
    }
    const total = lessons.length;
    const percent = total === 0 ? 0 : Math.round((count / total) * 100);
    await prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        progressPercent: percent,
        status: percent >= 100 ? EnrollmentStatus.COMPLETED : EnrollmentStatus.ACTIVE,
        completedAt: percent >= 100 ? new Date() : null,
        lastAccessedAt: new Date(),
      },
    });
  }

  // Alice: well into Java (matches the spec's 12/18-style example), just started web
  await completeLessons(alice.id, java.id, javaLessons, Math.min(7, javaLessons.length), 6);
  await completeLessons(alice.id, web.id, webLessons, 1, 1);

  // Bob: fully completed Java
  await completeLessons(bob.id, java.id, javaLessons, javaLessons.length, 12);

  // Carol: partway through web dev
  await completeLessons(carol.id, web.id, webLessons, 3, 4);

  await prisma.quizAttempt.create({
    data: { userId: alice.id, quizId: (await prisma.quiz.findFirstOrThrow()).id, score: 67, answers: {} },
  });

  await prisma.courseRating.createMany({
    data: [
      { userId: bob.id, courseId: java.id, rating: 5, review: "Excellent introduction to Java!" },
      { userId: alice.id, courseId: web.id, rating: 4, review: "Great pacing, could use more exercises." },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: alice.id, title: "Welcome to Parrot LMS", message: "Start your first course today.", type: NotificationType.INFO },
      { userId: bob.id, title: "Course completed", message: 'You completed "Java Programming". Great work!', type: NotificationType.ACHIEVEMENT },
    ],
  });

  console.log("Seed complete.");
  console.log("---------------------------------------------");
  console.log("Admin:      admin@parrot.dev / password123");
  console.log("Instructor: instructor@parrot.dev / password123");
  console.log("Instructor: priya@parrot.dev / password123");
  console.log("Student:    alice@parrot.dev / password123");
  console.log("Student:    bob@parrot.dev / password123");
  console.log("Student:    carol@parrot.dev / password123");
  console.log("---------------------------------------------");
  console.log("Java first lesson id:", javaFirstLessonId);
  console.log("Web first lesson id:", webFirstLessonId);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
