import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { notFound } from "next/navigation";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CirclePlay,
  Clock3,
  FileText,
  Globe2,
  Lock,
  MonitorPlay,
  PlayCircle,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingStars } from "@/components/features/rating-stars";
import { ReviewCard } from "@/components/features/review-card";
import { CourseCard } from "@/components/features/course-card";
import { LessonPreviewDialog } from "@/components/features/lesson-preview-dialog";
import { CourseActions } from "./course-actions";
import { getCourseBySlug, getRelatedCourses } from "@/lib/queries/courses";
import { getAssetUrl } from "@/lib/directus";
import type {
  Category,
  Course,
  DirectusUser,
  Lesson,
  Module,
  Review,
} from "@/types";

export const dynamic = "force-dynamic";

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

interface SectionCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

function SectionCard({ id, title, children }: SectionCardProps) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.5)]"
    >
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 phút";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;
}

function formatLessonDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function stripHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "--";
  return new Date(dateString).toLocaleDateString("vi-VN");
}

function getInstructors(course: Course): DirectusUser[] {
  if (!course.instructors) return [];
  const seen = new Set<string>();
  return course.instructors
    .map((ci) => ci.user_id)
    .filter((user): user is DirectusUser => {
      if (!user || typeof user === "string") return false;
      if (seen.has(user.id)) return false;
      seen.add(user.id);
      return true;
    });
}

function getCategoryId(course: Course): string | null {
  if (!course.category_id) return null;
  if (typeof course.category_id === "string") return course.category_id;
  return (course.category_id as Category).id;
}

function getCategoryName(course: Course): string | null {
  if (!course.category_id || typeof course.category_id === "string") return null;
  return (course.category_id as Category).name;
}

function getLevelLabel(level: Course["level"]): string {
  const labels: Record<Course["level"], string> = {
    beginner: "Người mới bắt đầu",
    intermediate: "Trung cấp",
    advanced: "Nâng cao",
  };
  return labels[level] ?? level;
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    return { title: "Không tìm thấy khoá học" };
  }

  return {
    title: course.title,
    description:
      stripHtml(course.short_description) ||
      stripHtml(course.description) ||
      `Khoá học ${course.title} trên E-Learning.`,
    openGraph: {
      title: course.title,
      description: stripHtml(course.description) || undefined,
      images: course.thumbnail ? [{ url: getAssetUrl(course.thumbnail) }] : undefined,
    },
  };
}

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  const instructors = getInstructors(course);
  const categoryName = getCategoryName(course);
  const categoryId = getCategoryId(course);

  let relatedCourses: Course[] = [];
  try {
    relatedCourses = await getRelatedCourses(course.id, categoryId, 4);
  } catch {
    // Best effort only.
  }

  const sortedModules = (course.modules || [])
    .sort((a, b) => a.sort - b.sort)
    .map((moduleItem) => ({
      ...moduleItem,
      lessons: ((moduleItem as Module).lessons || [])
        .filter((lesson) => (lesson as Lesson).status === "published")
        .sort((a, b) => (a as Lesson).sort - (b as Lesson).sort),
    }));

  const approvedReviews = (course.reviews || []).filter(
    (review) => (review as Review).status === "approved",
  ) as Review[];

  const averageRating =
    approvedReviews.length > 0
      ? Math.round(
          ((approvedReviews.reduce((acc, review) => acc + review.rating, 0) /
            approvedReviews.length) as number) * 10,
        ) / 10
      : Number(course.average_rating ?? 0);

  const ratingCounts = approvedReviews.reduce<Record<number, number>>(
    (acc, review) => {
      acc[review.rating] = (acc[review.rating] ?? 0) + 1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  );

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => {
    const count = ratingCounts[star] ?? 0;
    const percentage =
      approvedReviews.length > 0
        ? Math.round((count / approvedReviews.length) * 100)
        : 0;
    return { star, percentage };
  });

  const enrollmentCount =
    (course as { enrollment_count?: number }).enrollment_count ??
    course.total_enrollments ??
    0;

  const totalLessons = sortedModules.reduce(
    (accumulator, moduleItem) => accumulator + moduleItem.lessons.length,
    0,
  );

  const learningPoints = (course.what_you_learn ?? []).filter(
    (item) => item && item.trim().length > 0,
  );
  const requirements = (course.requirements ?? []).filter(
    (item) => item && item.trim().length > 0,
  );
  const targetAudience = (course.target_audience ?? []).filter(
    (item) => item && item.trim().length > 0,
  );

  const hasDiscount =
    course.discount_price !== null &&
    course.discount_price > 0 &&
    course.discount_price < course.price;
  const finalPrice = hasDiscount ? (course.discount_price ?? course.price) : course.price;
  const discountPercent =
    hasDiscount && course.price > 0
      ? Math.round(
          ((course.price - (course.discount_price ?? 0)) / course.price) * 100,
        )
      : 0;

  const heroDescription =
    stripHtml(course.description) ||
    stripHtml(course.short_description) ||
    "Khoá học thực chiến được thiết kế với lộ trình rõ ràng và cập nhật liên tục.";

  const tabItems = [
    { href: "#overview", label: "Tổng quan" },
    { href: "#coursecontent", label: "Nội dung khoá học" },
    { href: "#details", label: "Chi tiết" },
    { href: "#intructor", label: "Giảng viên" },
    { href: "#review", label: "Đánh giá" },
  ];

  const previewNode = (
    <div className="relative aspect-video overflow-hidden rounded-xl">
      <Image
        src={getAssetUrl(course.thumbnail)}
        alt={course.title}
        fill
        priority
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 1024px) 100vw, 360px"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-white/85 text-[#2f57ef] shadow-lg backdrop-blur-sm">
          <CirclePlay className="size-8" />
        </span>
      </div>
      <span className="absolute bottom-4 left-0 w-full text-center text-sm font-semibold text-white">
        Xem giới thiệu khoá học
      </span>
    </div>
  );

  return (
    <div className={`${poppins.className} bg-[#f6f8fc] text-slate-900`}>
      <section className="relative overflow-hidden border-b border-slate-200 bg-[#0f172a] text-white">
        <div className="absolute inset-0">
          <Image
            src={getAssetUrl(course.thumbnail)}
            alt={course.title}
            fill
            className="object-cover opacity-25 blur-[2px]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(47,87,239,0.35),transparent_40%),radial-gradient(circle_at_88%_15%,rgba(56,189,248,0.2),transparent_35%),linear-gradient(90deg,rgba(15,23,42,0.96),rgba(15,23,42,0.85))]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
          <ul className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <li>
              <Link href="/" className="transition-colors hover:text-white">
                Trang chủ
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-4" />
            </li>
            <li>
              <Link href="/courses" className="transition-colors hover:text-white">
                Khoá học
              </Link>
            </li>
            {categoryName ? (
              <>
                <li aria-hidden="true">
                  <ChevronRight className="size-4" />
                </li>
                <li className="font-medium text-white">{categoryName}</li>
              </>
            ) : null}
          </ul>

          <div className="mt-5 max-w-4xl">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {course.title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-200 sm:text-lg">
              {heroDescription}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <span className="font-bold text-amber-300">
                {Number(averageRating).toFixed(1)}
              </span>
              <RatingStars rating={averageRating} size="sm" showValue={false} />
            </div>
            <a
              href="#review"
              className="font-medium text-sky-200 underline underline-offset-4 transition-colors hover:text-white"
            >
              {approvedReviews.length} đánh giá
            </a>
            <span className="inline-flex items-center gap-1.5 text-slate-200">
              <Users className="size-4" />
              {enrollmentCount.toLocaleString("vi-VN")} học viên
            </span>
          </div>

          {instructors.length > 0 ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {instructors.map((instructor) => {
                const fullName =
                  [instructor.first_name, instructor.last_name]
                    .filter(Boolean)
                    .join(" ") || instructor.email;

                return (
                  <Link
                    key={instructor.id}
                    href={`/instructors/${instructor.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
                  >
                    <Avatar className="size-7 border border-white/30">
                      <AvatarImage
                        src={getAssetUrl(instructor.avatar)}
                        alt={fullName}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xs text-slate-900">
                        {(instructor.first_name?.[0] ?? "") +
                          (instructor.last_name?.[0] ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <span>{fullName}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-200">
            <li className="inline-flex items-center gap-2">
              <CalendarDays className="size-4" />
              Cập nhật: {formatDate(course.date_updated || course.date_created)}
            </li>
            <li className="inline-flex items-center gap-2">
              <Globe2 className="size-4" />
              {course.language || "Tiếng Việt"}
            </li>
            <li className="inline-flex items-center gap-2">
              <Award className="size-4" />
              Khoá học cấp chứng chỉ
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="order-2 space-y-6 lg:order-1">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_48px_-38px_rgba(15,23,42,0.5)]">
              <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
                <Image
                  src={getAssetUrl(course.thumbnail)}
                  alt={course.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 760px"
                />
              </div>
            </div>

            <nav className="sticky top-20 z-20 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur">
              <ul className="flex min-w-max items-center gap-1 p-2 text-sm font-semibold text-slate-600">
                {tabItems.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="inline-flex rounded-xl px-4 py-2.5 transition-colors hover:bg-[#eef3ff] hover:text-[#2f57ef]"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <SectionCard id="overview" title="Bạn sẽ học được gì">
              <p className="text-sm leading-relaxed text-slate-600">{heroDescription}</p>

              {learningPoints.length > 0 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {learningPoints.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span className="text-sm text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Nội dung mục tiêu học tập đang được cập nhật.
                </p>
              )}

              {course.content ? (
                <div
                  className="prose prose-slate mt-6 max-w-none border-t border-slate-200 pt-6 prose-a:text-[#2f57ef]"
                  dangerouslySetInnerHTML={{ __html: course.content }}
                />
              ) : null}
            </SectionCard>

            <SectionCard id="coursecontent" title="Nội dung khoá học">
              <p className="text-sm text-slate-500">
                {sortedModules.length} chương • {totalLessons} bài học • {formatDuration(course.total_duration)}
              </p>

              {sortedModules.length > 0 ? (
                <Accordion
                  type="multiple"
                  defaultValue={[String(sortedModules[0]?.id)]}
                  className="mt-4 divide-y rounded-xl border border-slate-200"
                >
                  {sortedModules.map((moduleItem) => (
                    <AccordionItem
                      key={moduleItem.id}
                      value={String(moduleItem.id)}
                      className="border-0"
                    >
                      <AccordionTrigger className="px-5 py-4 text-left font-semibold hover:bg-slate-50 hover:no-underline">
                        <div className="mr-4 flex flex-1 items-center justify-between gap-3">
                          <span className="text-slate-900">{moduleItem.title}</span>
                          <span className="text-xs font-medium text-slate-500">
                            {moduleItem.lessons.length} bài học
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0">
                        <ul className="divide-y border-t border-slate-200">
                          {moduleItem.lessons.map((lesson) => {
                            const lessonData = lesson as Lesson;

                            return (
                              <li
                                key={lessonData.id}
                                className="flex items-center justify-between gap-4 px-5 py-3"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  {lessonData.type === "video" ? (
                                    <PlayCircle className="size-4 shrink-0 text-slate-400" />
                                  ) : (
                                    <FileText className="size-4 shrink-0 text-slate-400" />
                                  )}
                                  <span className="truncate text-sm text-slate-700">
                                    {lessonData.title}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                                  {lessonData.is_free ? (
                                    <LessonPreviewDialog
                                      lesson={lessonData}
                                      course={course}
                                      trigger={
                                        <span className="cursor-pointer font-semibold text-[#2f57ef] hover:underline">
                                          Preview
                                        </span>
                                      }
                                    />
                                  ) : (
                                    <Lock className="size-3.5" />
                                  )}
                                  <span>{formatLessonDuration(lessonData.duration)}</span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Chưa có nội dung bài học để hiển thị.</p>
              )}
            </SectionCard>

            <SectionCard id="details" title="Chi tiết">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Yêu cầu</h3>
                  {requirements.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {requirements.map((requirement, index) => (
                        <li
                          key={`${requirement}-${index}`}
                          className="flex items-start gap-2.5 text-sm text-slate-600"
                        >
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2f57ef]" />
                          <span>{requirement}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Không có yêu cầu đầu vào đặc biệt.</p>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">Mục tiêu</h3>
                  {targetAudience.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {targetAudience.map((goal, index) => (
                        <li
                          key={`${goal}-${index}`}
                          className="flex items-start gap-2.5 text-sm text-slate-600"
                        >
                          <Star className="mt-0.5 size-4 shrink-0 text-amber-500" />
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  ) : learningPoints.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {learningPoints.slice(0, 5).map((goal, index) => (
                        <li
                          key={`${goal}-${index}`}
                          className="flex items-start gap-2.5 text-sm text-slate-600"
                        >
                          <Star className="mt-0.5 size-4 shrink-0 text-amber-500" />
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      Mục tiêu khoá học đang được cập nhật.
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>
            <SectionCard id="intructor" title="Giảng viên">
              {instructors.length > 0 ? (
                <div className="space-y-6">
                  {instructors.map((instructor) => {
                    const name =
                      [instructor.first_name, instructor.last_name]
                        .filter(Boolean)
                        .join(" ") || instructor.email;

                    return (
                      <div
                        key={instructor.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-5"
                      >
                        <div className="flex flex-col gap-5 sm:flex-row">
                          <Link href={`/instructors/${instructor.id}`}>
                            <Avatar className="size-24 border-2 border-white shadow-md">
                              <AvatarImage
                                src={getAssetUrl(instructor.avatar)}
                                alt={name}
                                className="object-cover"
                              />
                              <AvatarFallback className="text-xl">
                                {(instructor.first_name?.[0] ?? "") +
                                  (instructor.last_name?.[0] ?? "")}
                              </AvatarFallback>
                            </Avatar>
                          </Link>

                          <div className="flex-1">
                            <Link
                              href={`/instructors/${instructor.id}`}
                              className="text-lg font-bold text-slate-900 hover:text-[#2f57ef]"
                            >
                              {name}
                            </Link>
                            {instructor.headline ? (
                              <p className="mt-1 text-sm text-slate-500">{instructor.headline}</p>
                            ) : null}

                            <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-slate-600">
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                                <Star className="size-3.5 fill-amber-500 text-amber-500" />
                                {Number(averageRating).toFixed(1)} xếp hạng
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                                <Users className="size-3.5" />
                                {enrollmentCount.toLocaleString("vi-VN")} học viên
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                                <PlayCircle className="size-3.5" />
                                {totalLessons} bài học
                              </span>
                            </div>

                            {instructor.bio ? (
                              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                                {instructor.bio}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Thông tin giảng viên đang được cập nhật.</p>
              )}
            </SectionCard>

            <SectionCard id="review" title="Đánh giá">
              <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="flex h-full flex-col items-center justify-center rounded-2xl bg-[#f4f7ff] p-5 text-center">
                  <span className="text-5xl font-bold text-[#2f57ef]">
                    {Number(averageRating).toFixed(1)}
                  </span>
                  <RatingStars rating={averageRating} size="md" showValue={false} />
                  <span className="mt-2 text-xs font-medium text-slate-500">
                    {approvedReviews.length} đánh giá
                  </span>
                </div>

                <div className="space-y-3 self-center">
                  {ratingDistribution.map(({ star, percentage }) => (
                    <div key={star} className="flex items-center gap-3 text-sm">
                      <div className="w-14 text-xs font-medium text-slate-500">{star} sao</div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[#2f57ef]"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-slate-500">
                        {percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {approvedReviews.slice(0, 5).map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}

                {approvedReviews.length > 5 ? (
                  <Button variant="outline" className="w-full">
                    Xem thêm {approvedReviews.length - 5} đánh giá
                  </Button>
                ) : null}

                {approvedReviews.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có đánh giá nào.</p>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <aside className="order-1 lg:order-2">
            <div className="sticky top-24 space-y-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.6)]">
                {course.promo_video_url ? (
                  <a
                    href={course.promo_video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block"
                  >
                    {previewNode}
                  </a>
                ) : (
                  <div className="group">{previewNode}</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.6)]">
                <div className="flex flex-wrap items-end gap-3">
                  {finalPrice === 0 ? (
                    <span className="text-3xl font-extrabold text-emerald-600">Miễn phí</span>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-slate-900">
                        {formatPrice(finalPrice)}
                      </span>
                      {hasDiscount ? (
                        <span className="text-lg text-slate-400 line-through">
                          {formatPrice(course.price)}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>

                {hasDiscount ? (
                  <p className="mt-2 inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 ring-1 ring-rose-100">
                    Giảm ngay {discountPercent}%
                  </p>
                ) : null}

                <div className="mt-5">
                  <CourseActions
                    courseId={course.id}
                    courseSlug={course.slug}
                    price={course.price}
                    discountPrice={course.discount_price}
                  />
                </div>

                <p className="mt-4 text-center text-xs text-slate-500">
                  Cam kết hoàn tiền trong 30 ngày.
                </p>

                <div className="mt-6 border-t border-slate-200 pt-5">
                  <h3 className="text-sm font-semibold text-slate-900">Khoá học bao gồm:</h3>
                  <ul className="mt-3 space-y-3 text-sm text-slate-600">
                    <li className="flex items-center gap-2.5">
                      <MonitorPlay className="size-4 text-slate-500" />
                      {formatDuration(course.total_duration)} video theo yêu cầu
                    </li>
                    <li className="flex items-center gap-2.5">
                      <FileText className="size-4 text-slate-500" />
                      {totalLessons} bài học
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Clock3 className="size-4 text-slate-500" />
                      Học mọi lúc, mọi nơi
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Award className="size-4 text-slate-500" />
                      Chứng chỉ hoàn thành khoá học
                    </li>
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.6)]">
                <h3 className="text-sm font-semibold text-slate-900">Thông tin khoá học</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <Users className="size-4 text-slate-500" />
                      Học viên
                    </span>
                    <span className="font-semibold text-slate-800">
                      {enrollmentCount.toLocaleString("vi-VN")}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <FileText className="size-4 text-slate-500" />
                      Bài giảng
                    </span>
                    <span className="font-semibold text-slate-800">{totalLessons}</span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="size-4 text-slate-500" />
                      Tổng thời lượng
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatDuration(course.total_duration)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <Award className="size-4 text-slate-500" />
                      Cấp độ
                    </span>
                    <span className="font-semibold text-slate-800">
                      {getLevelLabel(course.level)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <Globe2 className="size-4 text-slate-500" />
                      Ngôn ngữ
                    </span>
                    <span className="font-semibold text-slate-800">
                      {course.language || "Tiếng Việt"}
                    </span>
                  </li>
                </ul>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <Button variant="outline" className="w-full">
                    Chia sẻ khoá học
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {relatedCourses.length > 0 ? (
        <section className="border-t border-slate-200 bg-white py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#2f57ef]">Khoá học liên quan</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Học viên thường đăng ký thêm
                </h2>
              </div>
              <Link
                href="/courses"
                className="text-sm font-semibold text-[#2f57ef] hover:underline"
              >
                Xem tất cả
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {relatedCourses.map((relatedCourse) => (
                <CourseCard key={relatedCourse.id} course={relatedCourse} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
