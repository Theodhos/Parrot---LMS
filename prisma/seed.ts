import bcrypt from "bcryptjs";
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

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function articleContent(title: string, courseTitle: string) {
  return `<h2>${title}</h2><p>This lesson is part of <strong>${courseTitle}</strong>. You'll work through the key ideas behind ${title.toLowerCase()} with explanations and practical examples.</p><ul><li>Key concept one</li><li>Key concept two</li><li>Key concept three</li></ul>`;
}

interface QuizAnswerSeed {
  answer: string;
  isCorrect: boolean;
}
interface QuizQuestionSeed {
  question: string;
  type: QuestionType;
  answers: QuizAnswerSeed[];
}
interface LessonSeed {
  title: string;
  type: LessonType;
  duration: number;
  videoUrl?: string;
  quiz?: { title: string; questions: QuizQuestionSeed[] };
}
interface ModuleSeed {
  title: string;
  description?: string;
  lessons: LessonSeed[];
}
interface CourseSeed {
  title: string;
  slug: string;
  description: string;
  thumbnail?: string;
  level: CourseLevel;
  status: CourseStatus;
  instructorId: string;
  categoryId: string;
  /** USD. Omit (or 0) for a free, self-enroll course. */
  priceUsd?: number;
  /** WooCommerce product id the "Buy" button links to; see the local WordPress dev site. */
  woocommerceProductId?: number;
  modules: ModuleSeed[];
}

async function seedCourse(seed: CourseSeed) {
  const course = await prisma.course.create({
    data: {
      title: seed.title,
      slug: seed.slug,
      description: seed.description,
      thumbnail: seed.thumbnail,
      level: seed.level,
      status: seed.status,
      instructorId: seed.instructorId,
      categoryId: seed.categoryId,
      priceCents: Math.round((seed.priceUsd ?? 0) * 100),
      woocommerceProductId: seed.woocommerceProductId ?? null,
    },
  });

  const lessonIds: string[] = [];
  let quizId: string | null = null;

  for (let mi = 0; mi < seed.modules.length; mi++) {
    const mod = seed.modules[mi]!;
    const moduleRecord = await prisma.module.create({
      data: { title: mod.title, description: mod.description ?? null, order: mi, courseId: course.id },
    });

    for (let li = 0; li < mod.lessons.length; li++) {
      const lesson = mod.lessons[li]!;
      const created = await prisma.lesson.create({
        data: {
          title: lesson.title,
          slug: slugify(lesson.title),
          description: `${lesson.title} — part of ${mod.title}.`,
          content: lesson.type === LessonType.QUIZ ? null : articleContent(lesson.title, seed.title),
          videoUrl: lesson.videoUrl ?? null,
          duration: lesson.duration,
          order: li,
          type: lesson.type,
          published: true,
          moduleId: moduleRecord.id,
          courseId: course.id,
        },
      });
      lessonIds.push(created.id);

      if (lesson.quiz) {
        const quiz = await prisma.quiz.create({
          data: {
            title: lesson.quiz.title,
            lessonId: created.id,
            questions: {
              create: lesson.quiz.questions.map((q, qi) => ({
                question: q.question,
                type: q.type,
                order: qi,
                answers: {
                  create: q.answers.map((a, ai) => ({ answer: a.answer, isCorrect: a.isCorrect, order: ai })),
                },
              })),
            },
          },
        });
        quizId = quiz.id;
      }
    }
  }

  return { course, lessonIds, quizId };
}

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
    prisma.courseAccess.deleteMany(),
    prisma.media.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const demoPasswordHash = await bcrypt.hash("password123", 10);

  const [, instructorIan, instructorPriya, alice, bob, carol] = await Promise.all([
    prisma.user.create({
      data: { name: "Ada Admin", email: "admin@parrot.dev", password: demoPasswordHash, role: Role.ADMIN },
    }),
    prisma.user.create({
      data: {
        name: "Ian Instructor",
        email: "instructor@parrot.dev",
        password: demoPasswordHash,
        role: Role.INSTRUCTOR,
        bio: "Backend engineer teaching programming, cloud and security for 10+ years.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Priya Patel",
        email: "priya@parrot.dev",
        password: demoPasswordHash,
        role: Role.INSTRUCTOR,
        bio: "Frontend architect, product designer and design-systems lead.",
      },
    }),
    prisma.user.create({
      data: { name: "Alice Student", email: "alice@parrot.dev", password: demoPasswordHash, role: Role.STUDENT },
    }),
    prisma.user.create({
      data: { name: "Bob Student", email: "bob@parrot.dev", password: demoPasswordHash, role: Role.STUDENT },
    }),
    prisma.user.create({
      data: { name: "Carol Student", email: "carol@parrot.dev", password: demoPasswordHash, role: Role.STUDENT },
    }),
  ]);

  const [catProgramming, catWeb, catData, catDesign, catMobile, catDevOps, catMarketing, catSecurity] =
    await Promise.all([
      prisma.courseCategory.create({ data: { name: "Programming", slug: "programming" } }),
      prisma.courseCategory.create({ data: { name: "Web Development", slug: "web-development" } }),
      prisma.courseCategory.create({ data: { name: "Data Science", slug: "data-science" } }),
      prisma.courseCategory.create({ data: { name: "Design", slug: "design" } }),
      prisma.courseCategory.create({ data: { name: "Mobile Development", slug: "mobile-development" } }),
      prisma.courseCategory.create({ data: { name: "DevOps & Cloud", slug: "devops-cloud" } }),
      prisma.courseCategory.create({ data: { name: "Marketing", slug: "marketing" } }),
      prisma.courseCategory.create({ data: { name: "Security", slug: "security" } }),
    ]);

  // ---------------------------------------------------------------------
  // Course 1: Java Programming
  // ---------------------------------------------------------------------
  const java = await seedCourse({
    title: "Java Programming",
    slug: "java-programming",
    description:
      "Learn Java from the ground up: syntax, object-oriented programming, collections, streams and multithreading.",
    thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
    level: CourseLevel.BEGINNER,
    status: CourseStatus.PUBLISHED,
    instructorId: instructorIan.id,
    categoryId: catProgramming.id,
    priceUsd: 99,
    woocommerceProductId: 10,
    modules: [
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
          {
            title: "Polymorphism",
            type: LessonType.QUIZ,
            duration: 300,
            quiz: {
              title: "Polymorphism Check",
              questions: [
                {
                  question: "What is method overriding?",
                  type: QuestionType.SINGLE_CHOICE,
                  answers: [
                    { answer: "Redefining a parent method in a subclass", isCorrect: true },
                    { answer: "Declaring two methods with the same name in one class", isCorrect: false },
                    { answer: "Calling a method twice", isCorrect: false },
                  ],
                },
                {
                  question: "Which of these enable polymorphism in Java?",
                  type: QuestionType.MULTIPLE_CHOICE,
                  answers: [
                    { answer: "Method overriding", isCorrect: true },
                    { answer: "Interfaces", isCorrect: true },
                    { answer: "Static fields", isCorrect: false },
                  ],
                },
                {
                  question: "Java supports multiple inheritance of classes.",
                  type: QuestionType.TRUE_FALSE,
                  answers: [
                    { answer: "True", isCorrect: false },
                    { answer: "False", isCorrect: true },
                  ],
                },
              ],
            },
          },
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
    ],
  });

  // ---------------------------------------------------------------------
  // Course 2: Modern Web Development
  // ---------------------------------------------------------------------
  const web = await seedCourse({
    title: "Modern Web Development",
    slug: "modern-web-development",
    description: "Build production-grade web apps with React, TypeScript and modern tooling.",
    thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.PUBLISHED,
    instructorId: instructorPriya.id,
    categoryId: catWeb.id,
    priceUsd: 79,
    woocommerceProductId: 11,
    modules: [
      {
        title: "Foundations",
        lessons: [
          { title: "HTML & Semantics", type: LessonType.ARTICLE, duration: 480 },
          { title: "Modern CSS", type: LessonType.ARTICLE, duration: 540 },
          { title: "TypeScript Basics", type: LessonType.ARTICLE, duration: 600 },
        ],
      },
      {
        title: "React Essentials",
        lessons: [
          { title: "Components & Props", type: LessonType.ARTICLE, duration: 600 },
          { title: "State & Effects", type: LessonType.VIDEO, duration: 660, videoUrl: "https://www.youtube.com/watch?v=O6P86uwfdR0" },
          { title: "Data Fetching", type: LessonType.ARTICLE, duration: 540 },
          {
            title: "React Essentials Quiz",
            type: LessonType.QUIZ,
            duration: 300,
            quiz: {
              title: "React Essentials Quiz",
              questions: [
                {
                  question: "What triggers a React component to re-render?",
                  type: QuestionType.SINGLE_CHOICE,
                  answers: [
                    { answer: "A change to its state or props", isCorrect: true },
                    { answer: "Refreshing the CSS file", isCorrect: false },
                    { answer: "Restarting the dev server", isCorrect: false },
                  ],
                },
                {
                  question: "useEffect runs synchronously before the browser paints.",
                  type: QuestionType.TRUE_FALSE,
                  answers: [
                    { answer: "True", isCorrect: false },
                    { answer: "False", isCorrect: true },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Course 3: Data Science Fundamentals
  // ---------------------------------------------------------------------
  const dataScience = await seedCourse({
    title: "Data Science Fundamentals",
    slug: "data-science-fundamentals",
    description: "An introduction to statistics, Python and data visualization for aspiring data scientists.",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
    level: CourseLevel.BEGINNER,
    status: CourseStatus.PUBLISHED,
    instructorId: instructorIan.id,
    categoryId: catData.id,
    priceUsd: 69,
    modules: [
      {
        title: "Getting Started",
        lessons: [
          { title: "Why Data Science?", type: LessonType.ARTICLE, duration: 300 },
          { title: "Setting Up Python for Data Science", type: LessonType.ARTICLE, duration: 420 },
          { title: "The Data Science Workflow", type: LessonType.ARTICLE, duration: 360 },
        ],
      },
      {
        title: "Statistics Essentials",
        lessons: [
          { title: "Descriptive Statistics", type: LessonType.ARTICLE, duration: 480 },
          { title: "Probability Basics", type: LessonType.ARTICLE, duration: 480 },
          { title: "Hypothesis Testing", type: LessonType.ARTICLE, duration: 540 },
          {
            title: "Statistics Quiz",
            type: LessonType.QUIZ,
            duration: 300,
            quiz: {
              title: "Statistics Quiz",
              questions: [
                {
                  question: "What does the mean of a dataset represent?",
                  type: QuestionType.SINGLE_CHOICE,
                  answers: [
                    { answer: "The average value", isCorrect: true },
                    { answer: "The most frequent value", isCorrect: false },
                    { answer: "The middle value when sorted", isCorrect: false },
                  ],
                },
                {
                  question: "A p-value below the significance threshold suggests statistical significance.",
                  type: QuestionType.TRUE_FALSE,
                  answers: [
                    { answer: "True", isCorrect: true },
                    { answer: "False", isCorrect: false },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Data Visualization",
        lessons: [
          { title: "Charts That Work", type: LessonType.VIDEO, duration: 600, videoUrl: "https://www.youtube.com/watch?v=a9UrKTVEeZA" },
          { title: "Storytelling with Data", type: LessonType.DOCUMENT, duration: 480 },
        ],
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Course 4: Python for Beginners
  // ---------------------------------------------------------------------
  const python = await seedCourse({
    title: "Python for Beginners",
    slug: "python-for-beginners",
    description: "Learn programming fundamentals with Python -- variables, control flow, functions and data structures.",
    thumbnail: "https://images.unsplash.com/photo-152637995098-d400fd0bf935?w=800",
    level: CourseLevel.BEGINNER,
    status: CourseStatus.PUBLISHED,
    instructorId: instructorIan.id,
    categoryId: catProgramming.id,
    modules: [
      {
        title: "Getting Started with Python",
        lessons: [
          { title: "Why Python?", type: LessonType.ARTICLE, duration: 300 },
          { title: "Installing Python & Setup", type: LessonType.ARTICLE, duration: 360 },
          { title: "Your First Script", type: LessonType.VIDEO, duration: 540, videoUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8" },
        ],
      },
      {
        title: "Python Fundamentals",
        lessons: [
          { title: "Variables & Data Types", type: LessonType.ARTICLE, duration: 480 },
          { title: "Control Flow", type: LessonType.ARTICLE, duration: 480 },
          { title: "Functions", type: LessonType.ARTICLE, duration: 540 },
          {
            title: "Fundamentals Quiz",
            type: LessonType.QUIZ,
            duration: 300,
            quiz: {
              title: "Python Fundamentals Quiz",
              questions: [
                {
                  question: "Which keyword defines a function in Python?",
                  type: QuestionType.SINGLE_CHOICE,
                  answers: [
                    { answer: "def", isCorrect: true },
                    { answer: "func", isCorrect: false },
                    { answer: "function", isCorrect: false },
                  ],
                },
                {
                  question: "Python is a statically typed language.",
                  type: QuestionType.TRUE_FALSE,
                  answers: [
                    { answer: "True", isCorrect: false },
                    { answer: "False", isCorrect: true },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Working with Data",
        lessons: [
          { title: "Lists & Dictionaries", type: LessonType.ARTICLE, duration: 540 },
          { title: "File I/O", type: LessonType.ARTICLE, duration: 420 },
          { title: "Intro to Libraries", type: LessonType.DOCUMENT, duration: 480 },
        ],
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Course 5: UI/UX Design Fundamentals
  // ---------------------------------------------------------------------
  const uiux = await seedCourse({
    title: "UI/UX Design Fundamentals",
    slug: "ui-ux-design-fundamentals",
    description: "Learn design thinking, visual design and prototyping to craft interfaces people love.",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
    level: CourseLevel.BEGINNER,
    status: CourseStatus.PUBLISHED,
    instructorId: instructorPriya.id,
    categoryId: catDesign.id,
    modules: [
      {
        title: "Design Thinking",
        lessons: [
          { title: "What is UX?", type: LessonType.ARTICLE, duration: 360 },
          { title: "User Research Basics", type: LessonType.ARTICLE, duration: 480 },
          { title: "Empathy Mapping", type: LessonType.ARTICLE, duration: 420 },
        ],
      },
      {
        title: "Visual Design",
        lessons: [
          { title: "Color Theory", type: LessonType.ARTICLE, duration: 480 },
          { title: "Typography", type: LessonType.ARTICLE, duration: 420 },
          { title: "Layout & Spacing", type: LessonType.ARTICLE, duration: 420 },
          {
            title: "Visual Design Quiz",
            type: LessonType.QUIZ,
            duration: 300,
            quiz: {
              title: "Visual Design Quiz",
              questions: [
                {
                  question: "What does contrast help achieve in a design?",
                  type: QuestionType.SINGLE_CHOICE,
                  answers: [
                    { answer: "Visual hierarchy and readability", isCorrect: true },
                    { answer: "Faster page load times", isCorrect: false },
                    { answer: "Smaller file sizes", isCorrect: false },
                  ],
                },
                {
                  question: "Which are common typography considerations?",
                  type: QuestionType.MULTIPLE_CHOICE,
                  answers: [
                    { answer: "Line height", isCorrect: true },
                    { answer: "Font pairing", isCorrect: true },
                    { answer: "Database indexing", isCorrect: false },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Prototyping",
        lessons: [
          { title: "Wireframing", type: LessonType.ARTICLE, duration: 420 },
          { title: "Figma Essentials", type: LessonType.VIDEO, duration: 720, videoUrl: "https://www.youtube.com/watch?v=FTFaQWZBqQ8" },
          { title: "Usability Testing", type: LessonType.DOCUMENT, duration: 480 },
        ],
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Course 6: Mobile App Development with React Native
  // ---------------------------------------------------------------------
  const mobile = await seedCourse({
    title: "Mobile App Development with React Native",
    slug: "mobile-app-development-react-native",
    description: "Build cross-platform mobile apps with React Native, from setup to app store deployment.",
    thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800",
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.PUBLISHED,
    instructorId: instructorPriya.id,
    categoryId: catMobile.id,
    priceUsd: 79,
    modules: [
      {
        title: "React Native Basics",
        lessons: [
          { title: "Setting Up Your Environment", type: LessonType.ARTICLE, duration: 420 },
          { title: "Components & Styling", type: LessonType.ARTICLE, duration: 480 },
          { title: "Navigation", type: LessonType.ARTICLE, duration: 540 },
        ],
      },
      {
        title: "Native Features",
        lessons: [
          { title: "Camera & Media", type: LessonType.ARTICLE, duration: 480 },
          { title: "Push Notifications", type: LessonType.ARTICLE, duration: 480 },
          { title: "Device Storage", type: LessonType.ARTICLE, duration: 420 },
          {
            title: "Native Features Quiz",
            type: LessonType.QUIZ,
            duration: 300,
            quiz: {
              title: "Native Features Quiz",
              questions: [
                {
                  question: "Which API is commonly used for local persistence in React Native?",
                  type: QuestionType.SINGLE_CHOICE,
                  answers: [
                    { answer: "AsyncStorage", isCorrect: true },
                    { answer: "localStorage", isCorrect: false },
                    { answer: "SessionStorage", isCorrect: false },
                  ],
                },
                {
                  question: "Push notifications require a backend or service to send them.",
                  type: QuestionType.TRUE_FALSE,
                  answers: [
                    { answer: "True", isCorrect: true },
                    { answer: "False", isCorrect: false },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Shipping Your App",
        lessons: [
          { title: "Testing on Devices", type: LessonType.VIDEO, duration: 600, videoUrl: "https://www.youtube.com/watch?v=0-S5a0eXPoc" },
          { title: "App Store Deployment", type: LessonType.DOCUMENT, duration: 540 },
        ],
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Course 7: Cloud & DevOps Essentials
  // ---------------------------------------------------------------------
  const devops = await seedCourse({
    title: "Cloud & DevOps Essentials",
    slug: "cloud-devops-essentials",
    description: "Understand cloud computing, CI/CD pipelines and infrastructure automation.",
    thumbnail: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800",
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.PUBLISHED,
    instructorId: instructorIan.id,
    categoryId: catDevOps.id,
    priceUsd: 59,
    modules: [
      {
        title: "Cloud Foundations",
        lessons: [
          { title: "What is Cloud Computing?", type: LessonType.ARTICLE, duration: 360 },
          { title: "AWS / Azure / GCP Overview", type: LessonType.ARTICLE, duration: 480 },
          { title: "Virtual Machines vs Containers", type: LessonType.ARTICLE, duration: 480 },
        ],
      },
      {
        title: "CI/CD & Automation",
        lessons: [
          { title: "Version Control with Git", type: LessonType.ARTICLE, duration: 420 },
          { title: "Building a CI/CD Pipeline", type: LessonType.VIDEO, duration: 660, videoUrl: "https://www.youtube.com/watch?v=1er2cjUq1UI" },
          { title: "Infrastructure as Code", type: LessonType.ARTICLE, duration: 540 },
          {
            title: "DevOps Quiz",
            type: LessonType.QUIZ,
            duration: 300,
            quiz: {
              title: "DevOps Quiz",
              questions: [
                {
                  question: "What does CI/CD stand for?",
                  type: QuestionType.SINGLE_CHOICE,
                  answers: [
                    { answer: "Continuous Integration / Continuous Delivery", isCorrect: true },
                    { answer: "Code Inspection / Code Deployment", isCorrect: false },
                    { answer: "Cloud Instance / Cloud Deployment", isCorrect: false },
                  ],
                },
                {
                  question: "Containers share the host OS kernel, unlike traditional VMs.",
                  type: QuestionType.TRUE_FALSE,
                  answers: [
                    { answer: "True", isCorrect: true },
                    { answer: "False", isCorrect: false },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Monitoring & Scaling",
        lessons: [
          { title: "Logging & Monitoring", type: LessonType.ARTICLE, duration: 420 },
          { title: "Auto-scaling Strategies", type: LessonType.DOCUMENT, duration: 420 },
        ],
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Course 8: Digital Marketing Mastery
  // ---------------------------------------------------------------------
  const marketing = await seedCourse({
    title: "Digital Marketing Mastery",
    slug: "digital-marketing-mastery",
    description: "Plan and run marketing campaigns across SEO, social, and email -- and measure what actually works.",
    thumbnail: "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800",
    level: CourseLevel.BEGINNER,
    status: CourseStatus.PUBLISHED,
    instructorId: instructorPriya.id,
    categoryId: catMarketing.id,
    modules: [
      {
        title: "Marketing Foundations",
        lessons: [
          { title: "Understanding Your Audience", type: LessonType.ARTICLE, duration: 360 },
          { title: "Brand Positioning", type: LessonType.ARTICLE, duration: 420 },
          { title: "Marketing Funnels", type: LessonType.ARTICLE, duration: 420 },
        ],
      },
      {
        title: "Channels & Tactics",
        lessons: [
          { title: "SEO Essentials", type: LessonType.ARTICLE, duration: 480 },
          { title: "Social Media Strategy", type: LessonType.ARTICLE, duration: 480 },
          { title: "Email Marketing", type: LessonType.ARTICLE, duration: 420 },
          {
            title: "Marketing Channels Quiz",
            type: LessonType.QUIZ,
            duration: 300,
            quiz: {
              title: "Marketing Channels Quiz",
              questions: [
                {
                  question: "What does SEO stand for?",
                  type: QuestionType.SINGLE_CHOICE,
                  answers: [
                    { answer: "Search Engine Optimization", isCorrect: true },
                    { answer: "Social Engagement Outreach", isCorrect: false },
                    { answer: "Site Element Ordering", isCorrect: false },
                  ],
                },
                {
                  question: "A/B testing compares two versions to see which performs better.",
                  type: QuestionType.TRUE_FALSE,
                  answers: [
                    { answer: "True", isCorrect: true },
                    { answer: "False", isCorrect: false },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Measuring Success",
        lessons: [
          { title: "Analytics & KPIs", type: LessonType.VIDEO, duration: 540, videoUrl: "https://www.youtube.com/watch?v=bixR-KIJKYM" },
          { title: "A/B Testing", type: LessonType.DOCUMENT, duration: 420 },
        ],
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Course 9: Cybersecurity Basics
  // ---------------------------------------------------------------------
  const security = await seedCourse({
    title: "Cybersecurity Basics",
    slug: "cybersecurity-basics",
    description: "Learn the fundamentals of staying secure online: threats, defenses and safe habits.",
    thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800",
    level: CourseLevel.BEGINNER,
    status: CourseStatus.PUBLISHED,
    instructorId: instructorIan.id,
    categoryId: catSecurity.id,
    priceUsd: 39,
    modules: [
      {
        title: "Security Foundations",
        lessons: [
          { title: "Why Cybersecurity Matters", type: LessonType.ARTICLE, duration: 360 },
          { title: "Common Threats & Attacks", type: LessonType.ARTICLE, duration: 480 },
          { title: "The CIA Triad", type: LessonType.ARTICLE, duration: 420 },
        ],
      },
      {
        title: "Defense Fundamentals",
        lessons: [
          { title: "Passwords & Authentication", type: LessonType.ARTICLE, duration: 420 },
          { title: "Network Security Basics", type: LessonType.ARTICLE, duration: 480 },
          { title: "Safe Browsing Habits", type: LessonType.ARTICLE, duration: 360 },
          {
            title: "Security Fundamentals Quiz",
            type: LessonType.QUIZ,
            duration: 300,
            quiz: {
              title: "Security Fundamentals Quiz",
              questions: [
                {
                  question: "What does the 'I' in the CIA triad stand for?",
                  type: QuestionType.SINGLE_CHOICE,
                  answers: [
                    { answer: "Integrity", isCorrect: true },
                    { answer: "Identity", isCorrect: false },
                    { answer: "Isolation", isCorrect: false },
                  ],
                },
                {
                  question: "Multi-factor authentication uses more than one verification method.",
                  type: QuestionType.TRUE_FALSE,
                  answers: [
                    { answer: "True", isCorrect: true },
                    { answer: "False", isCorrect: false },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Staying Secure",
        lessons: [
          { title: "Security Tools Overview", type: LessonType.VIDEO, duration: 480, videoUrl: "https://www.youtube.com/watch?v=inWWhr5tnEA" },
          { title: "Incident Response", type: LessonType.DOCUMENT, duration: 420 },
        ],
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Course 10: Machine Learning Foundations
  // ---------------------------------------------------------------------
  const ml = await seedCourse({
    title: "Machine Learning Foundations",
    slug: "machine-learning-foundations",
    description: "A practical introduction to machine learning concepts, core algorithms and model evaluation.",
    thumbnail: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800",
    level: CourseLevel.ADVANCED,
    status: CourseStatus.PUBLISHED,
    instructorId: instructorIan.id,
    categoryId: catData.id,
    priceUsd: 89,
    modules: [
      {
        title: "ML Foundations",
        lessons: [
          { title: "What is Machine Learning?", type: LessonType.ARTICLE, duration: 360 },
          { title: "Supervised vs Unsupervised Learning", type: LessonType.ARTICLE, duration: 420 },
          { title: "The ML Workflow", type: LessonType.ARTICLE, duration: 420 },
        ],
      },
      {
        title: "Core Algorithms",
        lessons: [
          { title: "Linear Regression", type: LessonType.ARTICLE, duration: 540 },
          { title: "Classification Basics", type: LessonType.ARTICLE, duration: 480 },
          { title: "Decision Trees", type: LessonType.ARTICLE, duration: 480 },
          {
            title: "ML Concepts Quiz",
            type: LessonType.QUIZ,
            duration: 300,
            quiz: {
              title: "ML Concepts Quiz",
              questions: [
                {
                  question: "Which type of learning uses labeled training data?",
                  type: QuestionType.SINGLE_CHOICE,
                  answers: [
                    { answer: "Supervised learning", isCorrect: true },
                    { answer: "Unsupervised learning", isCorrect: false },
                    { answer: "Reinforcement learning", isCorrect: false },
                  ],
                },
                {
                  question: "Overfitting means a model performs well on training data but poorly on new data.",
                  type: QuestionType.TRUE_FALSE,
                  answers: [
                    { answer: "True", isCorrect: true },
                    { answer: "False", isCorrect: false },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Practical ML",
        lessons: [
          { title: "Intro to Neural Networks", type: LessonType.VIDEO, duration: 660, videoUrl: "https://www.youtube.com/watch?v=aircAruvnKk" },
          { title: "Model Evaluation", type: LessonType.DOCUMENT, duration: 480 },
        ],
      },
    ],
  });

  console.log(`Seeded ${10} courses across ${8} categories.`);

  // ---------------------------------------------------------------------
  // Enrollments + progress -- spread across students so dashboards,
  // course-detail module progress and analytics all have real data.
  // ---------------------------------------------------------------------
  async function enrollAndComplete(
    userId: string,
    courseId: string,
    lessonIds: string[],
    completeCount: number,
    daysAgoStart: number,
  ) {
    await prisma.enrollment.create({
      data: { userId, courseId, status: EnrollmentStatus.ACTIVE, progressPercent: 0, lastAccessedAt: new Date() },
    });

    const toComplete = lessonIds.slice(0, completeCount);
    for (let i = 0; i < toComplete.length; i++) {
      const completedAt = new Date(Date.now() - (daysAgoStart - i) * 24 * 60 * 60 * 1000);
      await prisma.progress.create({
        data: {
          userId,
          courseId,
          lessonId: toComplete[i]!,
          completed: true,
          progressPercent: 100,
          startedAt: completedAt,
          completedAt,
          updatedAt: completedAt,
        },
      });
      await prisma.learningActivity.create({
        data: { userId, courseId, lessonId: toComplete[i]!, type: ActivityType.LESSON_COMPLETED, minutesSpent: 8, occurredAt: completedAt },
      });
    }

    const total = lessonIds.length;
    const percent = total === 0 ? 0 : Math.round((completeCount / total) * 100);
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

  // Alice: deep into Java (module 1 + 2 done), just started Web Dev, finished Python's first module.
  await enrollAndComplete(alice.id, java.course.id, java.lessonIds, Math.min(7, java.lessonIds.length), 6);
  await enrollAndComplete(alice.id, web.course.id, web.lessonIds, 1, 1);
  await enrollAndComplete(alice.id, python.course.id, python.lessonIds, 3, 2);

  // Bob: fully completed Java, partway through Mobile Dev, just enrolled in DevOps.
  await enrollAndComplete(bob.id, java.course.id, java.lessonIds, java.lessonIds.length, 12);
  await enrollAndComplete(bob.id, mobile.course.id, mobile.lessonIds, 4, 5);
  await enrollAndComplete(bob.id, devops.course.id, devops.lessonIds, 0, 0);

  // Carol: module 1 done in Web Dev, module 1 done in Data Science, partway through Marketing.
  await enrollAndComplete(carol.id, web.course.id, web.lessonIds, 3, 4);
  await enrollAndComplete(carol.id, dataScience.course.id, dataScience.lessonIds, 3, 3);
  await enrollAndComplete(carol.id, marketing.course.id, marketing.lessonIds, 2, 1);

  // Quiz attempts -- gives the admin/student analytics real quiz-performance data.
  const quizAttempts = [
    { userId: alice.id, quizId: java.quizId, score: 67 },
    { userId: alice.id, quizId: python.quizId, score: 85 },
    { userId: bob.id, quizId: mobile.quizId, score: 72 },
    { userId: carol.id, quizId: dataScience.quizId, score: 90 },
  ].filter((attempt): attempt is { userId: string; quizId: string; score: number } => attempt.quizId !== null);

  for (const attempt of quizAttempts) {
    await prisma.quizAttempt.create({ data: { ...attempt, answers: {} } });
  }

  await prisma.courseRating.createMany({
    data: [
      { userId: bob.id, courseId: java.course.id, rating: 5, review: "Excellent introduction to Java!" },
      { userId: alice.id, courseId: web.course.id, rating: 4, review: "Great pacing, could use more exercises." },
      { userId: carol.id, courseId: dataScience.course.id, rating: 5, review: "Finally understand statistics!" },
      { userId: bob.id, courseId: mobile.course.id, rating: 4, review: "Solid, practical projects." },
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
  console.log("All accounts use password: password123");
  console.log("Admin:      admin@parrot.dev");
  console.log("Instructor: instructor@parrot.dev");
  console.log("Instructor: priya@parrot.dev");
  console.log("Student:    alice@parrot.dev");
  console.log("Student:    bob@parrot.dev");
  console.log("Student:    carol@parrot.dev");
  console.log("---------------------------------------------");
  console.log(
    "Courses:",
    [java, web, dataScience, python, uiux, mobile, devops, marketing, security, ml].map((c) => c.course.title).join(", "),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
