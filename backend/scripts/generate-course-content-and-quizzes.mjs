#!/usr/bin/env node

/**
 * Auto-generate modules, lessons, and quizzes for published courses.
 *
 * Defaults:
 * - 3 modules per course
 * - 4 lessons per module (12 lessons total)
 * - 1 quiz per module
 * - 5 questions per quiz
 *
 * Usage:
 *   node backend/scripts/generate-course-content-and-quizzes.mjs
 *   node backend/scripts/generate-course-content-and-quizzes.mjs --limit=30
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");

function loadEnv(path) {
  const content = readFileSync(path, "utf-8");
  const out = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const splitIdx = trimmed.indexOf("=");
    if (splitIdx < 0) continue;

    const key = trimmed.slice(0, splitIdx).trim();
    const value = trimmed.slice(splitIdx + 1).trim();
    out[key] = value;
  }

  return out;
}

function getArgValue(name) {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return null;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function extractId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "id" in value) {
    const id = value.id;
    if (typeof id === "string") return id;
    if (typeof id === "number") return String(id);
  }
  return null;
}

function normalizeSlug(value) {
  const base = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "item";
}

function buildUniqueSlug(baseSlug, slugSet) {
  if (!slugSet.has(baseSlug)) {
    slugSet.add(baseSlug);
    return baseSlug;
  }

  let idx = 2;
  while (slugSet.has(`${baseSlug}-${idx}`)) {
    idx += 1;
  }
  const finalSlug = `${baseSlug}-${idx}`;
  slugSet.add(finalSlug);
  return finalSlug;
}

function courseTopic(title) {
  if (!title) return "Khóa học";

  return String(title)
    .replace(/^Lộ Trình Toàn Diện\s+/i, "")
    .replace(/\s+2026$/i, "")
    .replace(/: Từ Cơ Bản Đến Nâng Cao$/i, "")
    .replace(/\s+Thực Chiến Qua Dự Án Thực Tế$/i, "")
    .replace(/: Từ Số 0 Đến Sẵn Sàng Đi Làm$/i, "")
    .replace(/^Bộ Công Cụ Và Quy Trình Chuyên Nghiệp\s+/i, "")
    .replace(/\s+Cấp Tốc: Xây Dựng, Ra Mắt, Tối Ưu$/i, "")
    .replace(/\s+Cho Đội Nhóm Và (Freelancer|Làm Việc Tự Do)$/i, "")
    .replace(/\s+Nâng Cao: Chiến Lược Và (Case Study|Tình Huống Thực Tế)$/i, "")
    .replace(/^Lộ Trình Nghề Nghiệp\s+/i, "")
    .replace(/: (Portfolio|Hồ Sơ Dự Án) Và Triển Khai$/i, "")
    .replace(/\s+30 Ngày: Kế Hoạch Thực Hành$/i, "")
    .replace(/^The Complete\s+/i, "")
    .replace(/(Bootcamp \d{4}|Masterclass: Beginner to Pro)$/i, "")
    .replace(/(in Practice: Real World Projects)$/i, "")
    .replace(/(Zero to Job-Ready Path)$/i, "")
    .replace(/(Professional Toolkit and Workflows)$/i, "")
    .replace(/(Intensive: Build, Launch, Improve)$/i, "")
    .replace(/(for Teams and Freelancers)$/i, "")
    .replace(/(Advanced Strategies and Case Studies)$/i, "")
    .replace(/(Career Track: Portfolio and Execution)$/i, "")
    .replace(/(Accelerator: 30-Day Practical Plan)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const env = loadEnv(envPath);
const BASE_URL = env.DIRECTUS_URL || "http://localhost:8055";
const ADMIN_EMAIL = env.ADMIN_EMAIL || "admin@elearning.dev";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "Admin@123456";
const LIMIT = Number(getArgValue("limit")) || 0;

let token = "";

async function api(method, path, body = null) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload?.data ?? payload;
}

const get = (path) => api("GET", path);
const post = (path, body) => api("POST", path, body);
const patch = (path, body) => api("PATCH", path, body);

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function waitForDirectus(maxRetries = 45) {
  for (let i = 0; i < maxRetries; i += 1) {
    try {
      const health = await fetch(`${BASE_URL}/server/health`);
      if (health.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
  }
  return false;
}

const MODULE_BLUEPRINTS = [
  {
    title: "Nền tảng cốt lõi",
    description: "Xây nền kiến thức quan trọng và thiết lập quy trình học hiệu quả.",
    lessons: [
      { title: "Tổng quan khóa học và mục tiêu", duration: 720, isFree: true },
      { title: "Thiết lập môi trường học tập", duration: 900, isFree: false },
      { title: "Giải thích các khái niệm cốt lõi", duration: 960, isFree: false },
      { title: "Phiên thực hành có hướng dẫn", duration: 1080, isFree: false },
    ],
    quizTitle: "Kiểm tra nền tảng",
  },
  {
    title: "Quy trình thực chiến",
    description: "Luyện tập theo từng bước triển khai có cấu trúc.",
    lessons: [
      { title: "Khung quy trình triển khai", duration: 840, isFree: false },
      { title: "Thực hành lab phần 1", duration: 1020, isFree: false },
      { title: "Thực hành lab phần 2", duration: 1140, isFree: false },
      { title: "Checklist chất lượng và lỗi thường gặp", duration: 900, isFree: false },
    ],
    quizTitle: "Quiz quy trình thực chiến",
  },
  {
    title: "Dự án và lộ trình nghề nghiệp",
    description: "Hoàn thiện dự án cuối khóa, review kết quả và định hướng bước tiếp theo.",
    lessons: [
      { title: "Đề bài capstone và phạm vi", duration: 900, isFree: false },
      { title: "Walkthrough triển khai capstone", duration: 1200, isFree: false },
      { title: "Review, phản hồi và cải tiến", duration: 960, isFree: false },
      { title: "Lộ trình nghề nghiệp và bước tiếp theo", duration: 780, isFree: false },
    ],
    quizTitle: "Quiz đánh giá cuối khóa",
  },
];

function buildLessonContent({ topic, moduleTitle, lessonTitle, level }) {
  const levelMap = {
    beginner: "Cơ bản",
    intermediate: "Trung cấp",
    advanced: "Nâng cao",
  };
  const levelLabel = levelMap[level] ?? "Cơ bản";

  return `<h2>${lessonTitle}</h2><p>Bài học này thuộc chủ đề <strong>${topic}</strong> và tập trung vào kết quả có thể áp dụng ngay.</p><p>Cấp độ: <strong>${levelLabel}</strong>. Bạn sẽ học qua ví dụ thực tế và lộ trình từng bước rõ ràng.</p><ul><li>Nắm mục tiêu chính của bài học</li><li>Áp dụng quy trình triển khai theo từng bước</li><li>Ôn lại best practices và các lỗi thường gặp</li></ul><p>Sau khi hoàn thành, hãy tiếp tục sang bài kế tiếp trong module <strong>${moduleTitle}</strong>.</p>`;
}

function buildQuestionSet({ topic, moduleTitle, quizTitle }) {
  return [
    {
      question_text: `Mục tiêu chính của module "${moduleTitle}" trong ${topic} là gì?`,
      explanation: "Mục tiêu của module là kết hợp kiến thức với khả năng triển khai thực tế.",
      answers: [
        { answer_text: "Chỉ ghi nhớ lý thuyết mà không thực hành", is_correct: false },
        { answer_text: "Áp dụng kiến thức thông qua quy trình thực hành", is_correct: true },
        { answer_text: "Bỏ qua phần nền tảng và học ngay nội dung nâng cao", is_correct: false },
        { answer_text: "Chỉ tập trung vào điểm số cuối kỳ", is_correct: false },
      ],
    },
    {
      question_text: `Cách tiếp cận nào giúp tiến bộ tốt nhất trong "${quizTitle}"?`,
      explanation: "Thực hành đều đặn kết hợp vòng lặp ôn tập sẽ tạo ra tiến bộ bền vững.",
      answers: [
        { answer_text: "Làm xong một lần và không xem lại", is_correct: false },
        { answer_text: "Thực hành, ôn tập và cải tiến thường xuyên", is_correct: true },
        { answer_text: "Chỉ xem bài giảng thụ động mà không thực hành", is_correct: false },
        { answer_text: "Bỏ qua phản hồi từ các mốc kiểm tra", is_correct: false },
      ],
    },
    {
      question_text: `Trong ${topic}, vì sao checklist hữu ích khi thực hành?`,
      explanation: "Checklist giúp giảm sai sót và giữ chất lượng ổn định.",
      answers: [
        { answer_text: "Checklist thay thế hoàn toàn cho việc học", is_correct: false },
        { answer_text: "Checklist giúp duy trì tính nhất quán và chất lượng", is_correct: true },
        { answer_text: "Checklist khiến việc kiểm thử không còn cần thiết", is_correct: false },
        { answer_text: "Checklist đảm bảo kết quả hoàn hảo ngay lập tức", is_correct: false },
      ],
    },
    {
      question_text: `Bạn nên làm gì sau khi hoàn thành một bài thực hành trong ${topic}?`,
      explanation: "Việc rà soát và cải tiến là cần thiết để giữ và nâng kỹ năng.",
      answers: [
        { answer_text: "Chuyển sang phần tiếp theo mà không kiểm tra kết quả", is_correct: false },
        { answer_text: "Rà soát kết quả và cải thiện điểm còn yếu", is_correct: true },
        { answer_text: "Xóa ghi chú và làm lại từ đầu mỗi lần", is_correct: false },
        { answer_text: "Bỏ qua tài liệu hóa và kiểm thử", is_correct: false },
      ],
    },
    {
      question_text: `Hành vi nào giúp phát triển kỹ năng lâu dài trong ${topic}?`,
      explanation: "Thực hành đều và theo dõi mốc tiến bộ rõ ràng giúp tăng trưởng bền vững.",
      answers: [
        { answer_text: "Chỉ học khi đến hạn deadline", is_correct: false },
        { answer_text: "Theo lộ trình có các mốc thực hành định kỳ", is_correct: true },
        { answer_text: "Đổi công cụ mỗi ngày mà không có mục tiêu", is_correct: false },
        { answer_text: "Tránh mọi hình thức học qua dự án", is_correct: false },
      ],
    },
  ];
}

async function main() {
  log("Checking Directus health...");
  const healthy = await waitForDirectus();
  if (!healthy) {
    throw new Error(`Directus is not reachable at ${BASE_URL}`);
  }

  log(`Authenticating as ${ADMIN_EMAIL}...`);
  const loginResult = await post("/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  token = loginResult.access_token;
  if (!token) {
    throw new Error("Authentication failed: access_token is missing");
  }

  const categories = toArray(
    await get("/items/categories?filter[status][_eq]=published&fields=id,parent_id&limit=-1")
  );
  const childCategoryIds = new Set(
    categories
      .filter((category) => Boolean(extractId(category.parent_id)))
      .map((category) => category.id)
  );

  const allPublishedCourses = toArray(
    await get("/items/courses?filter[status][_eq]=published&fields=id,title,slug,level,category_id&limit=-1")
  );
  const eligibleCourses = allPublishedCourses.filter((course) => {
    const categoryId = extractId(course.category_id);
    return Boolean(categoryId && childCategoryIds.has(categoryId));
  });

  const modules = toArray(
    await get("/items/modules?fields=id,course_id&limit=-1")
  );
  const modulesByCourse = new Map();
  for (const moduleItem of modules) {
    const courseId = extractId(moduleItem.course_id);
    if (!courseId) continue;
    modulesByCourse.set(courseId, (modulesByCourse.get(courseId) ?? 0) + 1);
  }

  const lessonRows = toArray(await get("/items/lessons?fields=slug&limit=-1"));
  const lessonSlugSet = new Set(
    lessonRows
      .map((item) => (typeof item?.slug === "string" ? item.slug : null))
      .filter(Boolean)
  );

  let targetCourses = eligibleCourses.filter(
    (course) => (modulesByCourse.get(course.id) ?? 0) === 0
  );
  if (LIMIT > 0) {
    targetCourses = targetCourses.slice(0, LIMIT);
  }

  if (targetCourses.length === 0) {
    log("No target courses found (all already have modules or no eligible courses).");
    return;
  }

  log(`Generating content for ${targetCourses.length} course(s)...`);

  let generatedCourses = 0;
  let createdModulesCount = 0;
  let createdLessonsCount = 0;
  let createdQuizzesCount = 0;
  let createdQuestionsCount = 0;
  let createdAnswersCount = 0;
  const failedCourses = [];

  for (let index = 0; index < targetCourses.length; index += 1) {
    const course = targetCourses[index];
    const topic = courseTopic(course.title || course.slug || "Course");

    try {
      const modulePayloads = MODULE_BLUEPRINTS.map((moduleDef, moduleIdx) => ({
        title: `${topic} - ${moduleDef.title}`,
        description: moduleDef.description,
        sort: moduleIdx + 1,
        course_id: course.id,
      }));

      const createdModules = toArray(await post("/items/modules", modulePayloads));
      if (createdModules.length === 0) {
        throw new Error("module creation returned 0 items");
      }
      createdModulesCount += createdModules.length;

      const lessonsPayloads = [];
      let totalDuration = 0;

      for (let moduleIdx = 0; moduleIdx < createdModules.length; moduleIdx += 1) {
        const moduleRecord = createdModules[moduleIdx];
        const moduleDef = MODULE_BLUEPRINTS[moduleIdx] ?? MODULE_BLUEPRINTS[0];

        for (let lessonIdx = 0; lessonIdx < moduleDef.lessons.length; lessonIdx += 1) {
          const lessonDef = moduleDef.lessons[lessonIdx];
          const title = `${lessonDef.title} (${topic})`;
          const baseSlug = `${normalizeSlug(course.slug)}-m${moduleIdx + 1}-l${lessonIdx + 1}-${normalizeSlug(lessonDef.title)}`;
          const slug = buildUniqueSlug(baseSlug, lessonSlugSet);
          const duration = lessonDef.duration + ((index + moduleIdx + lessonIdx) % 4) * 60;
          totalDuration += duration;

          lessonsPayloads.push({
            title,
            slug,
            sort: lessonIdx + 1,
            type: "text",
            content: buildLessonContent({
              topic,
              moduleTitle: moduleRecord.title,
              lessonTitle: title,
              level: course.level,
            }),
            duration,
            is_free: lessonDef.isFree,
            status: "published",
            module_id: moduleRecord.id,
          });
        }
      }

      const createdLessons = toArray(await post("/items/lessons", lessonsPayloads));
      if (createdLessons.length === 0) {
        throw new Error("lesson creation returned 0 items");
      }
      createdLessonsCount += createdLessons.length;

      const lastLessonByModule = new Map();
      for (const lesson of createdLessons) {
        const moduleId = extractId(lesson.module_id);
        if (!moduleId) continue;

        const prev = lastLessonByModule.get(moduleId);
        if (!prev || Number(lesson.sort ?? 0) > Number(prev.sort ?? 0)) {
          lastLessonByModule.set(moduleId, lesson);
        }
      }

      const quizzesPayload = [];
      for (let moduleIdx = 0; moduleIdx < createdModules.length; moduleIdx += 1) {
        const moduleRecord = createdModules[moduleIdx];
        const moduleDef = MODULE_BLUEPRINTS[moduleIdx] ?? MODULE_BLUEPRINTS[0];
        const finalLesson = lastLessonByModule.get(moduleRecord.id);
        if (!finalLesson?.id) continue;

        quizzesPayload.push({
          title: `${moduleDef.quizTitle} - ${topic}`,
          description: `Bài quiz đánh giá kiến thức của module "${moduleRecord.title}" trong khóa học "${course.title}".`,
          lesson_id: finalLesson.id,
          passing_score: 70,
          time_limit: 20,
          max_attempts: 3,
        });
      }

      const createdQuizzes = toArray(await post("/items/quizzes", quizzesPayload));
      createdQuizzesCount += createdQuizzes.length;

      for (let quizIdx = 0; quizIdx < createdQuizzes.length; quizIdx += 1) {
        const quiz = createdQuizzes[quizIdx];
        const moduleDef = MODULE_BLUEPRINTS[quizIdx] ?? MODULE_BLUEPRINTS[0];
        const questionDefs = buildQuestionSet({
          topic,
          moduleTitle: moduleDef.title,
          quizTitle: quiz.title,
        });

        const questionPayload = questionDefs.map((question, questionIdx) => ({
          quiz_id: quiz.id,
          question_text: question.question_text,
          question_type: "single_choice",
          sort: questionIdx + 1,
          points: 1,
          explanation: question.explanation,
        }));

        const createdQuestions = toArray(await post("/items/quiz_questions", questionPayload));
        createdQuestionsCount += createdQuestions.length;

        const answersPayload = [];
        for (let qIdx = 0; qIdx < createdQuestions.length; qIdx += 1) {
          const questionRecord = createdQuestions[qIdx];
          const answerDefs = questionDefs[qIdx]?.answers ?? [];

          for (let answerIdx = 0; answerIdx < answerDefs.length; answerIdx += 1) {
            answersPayload.push({
              question_id: questionRecord.id,
              answer_text: answerDefs[answerIdx].answer_text,
              is_correct: answerDefs[answerIdx].is_correct,
              sort: answerIdx + 1,
            });
          }
        }

        if (answersPayload.length > 0) {
          const createdAnswers = toArray(await post("/items/quiz_answers", answersPayload));
          createdAnswersCount += createdAnswers.length;
        }
      }

      await patch(`/items/courses/${course.id}`, {
        total_lessons: createdLessons.length,
        total_duration: totalDuration,
      });

      generatedCourses += 1;
      if ((index + 1) % 10 === 0 || index + 1 === targetCourses.length) {
        log(`Progress: ${index + 1}/${targetCourses.length} courses processed.`);
      }
    } catch (error) {
      failedCourses.push({
        courseId: course.id,
        title: course.title,
        message: error instanceof Error ? error.message : String(error),
      });
      log(`Failed course: ${course.title} (${course.id})`);
    }
  }

  log("");
  log("Generation completed.");
  log(`- Courses generated: ${generatedCourses}/${targetCourses.length}`);
  log(`- Modules created: ${createdModulesCount}`);
  log(`- Lessons created: ${createdLessonsCount}`);
  log(`- Quizzes created: ${createdQuizzesCount}`);
  log(`- Questions created: ${createdQuestionsCount}`);
  log(`- Answers created: ${createdAnswersCount}`);
  if (failedCourses.length > 0) {
    log(`- Failed courses: ${failedCourses.length}`);
    for (const failed of failedCourses.slice(0, 10)) {
      log(`  • ${failed.title} (${failed.courseId}) -> ${failed.message}`);
    }
  }
}

main().catch((error) => {
  console.error(`Generation failed: ${error.message}`);
  process.exit(1);
});
