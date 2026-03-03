import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock,
  Globe,
  PlayCircle,
  FileText,
  CheckCircle2,
  Lock,
  Star,
  MonitorPlay,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { CourseActions } from "./course-actions";
import { getCourseBySlug, getRelatedCourses } from "@/lib/queries/courses";
import { getAssetUrl } from "@/lib/directus";
import type {
  Course,
  DirectusUser,
  Category,
  Module,
  Lesson,
  Review,
} from "@/types";
import { LessonPreviewDialog } from "@/components/features/lesson-preview-dialog";

export const dynamic = "force-dynamic";

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}

function formatLessonDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getInstructors(course: Course): DirectusUser[] {
  if (!course.instructors) return [];
  const seen = new Set<string>();
  return course.instructors
    .map((ci) => ci.user_id)
    .filter((u): u is DirectusUser => {
      if (typeof u === "string") return false;
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
}

function getCategoryId(course: Course): string | null {
  if (!course.category_id) return null;
  if (typeof course.category_id === "string") return course.category_id;
  return (course.category_id as Category).id;
}

function getCategoryName(course: Course): string | null {
  if (!course.category_id || typeof course.category_id === "string")
    return null;
  return (course.category_id as Category).name;
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
      course.description || `Khoá học ${course.title} trên E-Learning.`,
    openGraph: {
      title: course.title,
      description: course.description || undefined,
      images: course.thumbnail
        ? [{ url: getAssetUrl(course.thumbnail) }]
        : undefined,
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
    // Fail silently
  }

  const sortedModules = (course.modules || [])
    .sort((a, b) => a.sort - b.sort)
    .map((mod) => ({
      ...mod,
      lessons: ((mod as Module).lessons || [])
        .filter((l) => (l as Lesson).status === "published")
        .sort((a, b) => (a as Lesson).sort - (b as Lesson).sort),
    }));

  const approvedReviews = (course.reviews || []).filter(
    (r) => (r as Review).status === "approved",
  ) as Review[];

  const averageRating =
    approvedReviews.length > 0
      ? Math.round(
          ((approvedReviews.reduce((acc, r) => acc + r.rating, 0) /
            approvedReviews.length) as number) * 10
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
    (acc, mod) => acc + mod.lessons.length,
    0,
  );

  return (
    <>
      {/* Hero Section */}
      <div className="bg-zinc-900 py-10 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Breadcrumb */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                <Link href="/" className="hover:text-white transition-colors">
                  Trang chủ
                </Link>
                <span>/</span>
                <Link
                  href="/courses"
                  className="hover:text-white transition-colors"
                >
                  Khoá học
                </Link>
                {categoryName && (
                  <>
                    <span>/</span>
                    <span className="text-white font-medium">
                      {categoryName}
                    </span>
                  </>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-4">
                <h1 className="text-3xl font-bold sm:text-4xl text-white">
                  {course.title}
                </h1>
                <p className="text-lg text-zinc-300 max-w-3xl">
                  {course.description}
                </p>
              </div>

              {/* Rating & Stats */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-amber-500">
                    {Number(averageRating).toFixed(1)}
                  </span>
                  <RatingStars rating={averageRating} size="sm" />
                </div>
                <Link
                  href="#reviews"
                  className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
                >
                  ({approvedReviews.length} đánh giá)
                </Link>
                <span className="text-zinc-400">
                  {enrollmentCount.toLocaleString()} học viên
                </span>
              </div>

              {/* Instructor (Mini) & Meta */}
              <div className="flex flex-wrap gap-6 text-sm text-zinc-300">
                <div className="flex items-center gap-2">
                  <span>Được tạo bởi</span>
                  {instructors.map((inst, i) => (
                    <Link
                      key={inst.id}
                      href={`/instructors/${inst.id}`}
                      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
                    >
                      {[inst.first_name, inst.last_name]
                        .filter(Boolean)
                        .join(" ")}
                      {i < instructors.length - 1 && ", "}
                    </Link>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4" />
                  <span>
                    Cập nhật lần cuối{" "}
                    {new Date(
                      course.date_updated || course.date_created,
                    ).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="size-4" />
                  <span>{course.language}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content & Sidebar Container */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Content (Left) */}
          <div className="lg:col-span-2 space-y-10 order-2 lg:order-1">
            {/* What you'll learn */}
            {course.what_you_learn && course.what_you_learn.length > 0 && (
              <div className="rounded-lg border bg-card p-6">
                <h2 className="mb-4 text-xl font-bold">Bạn sẽ học được gì</h2>
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  {course.what_you_learn.map((obj, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="size-5 shrink-0 text-green-500 mt-0.5" />
                      <span className="text-sm text-muted-foreground">
                        {obj}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Curriculum */}
            {sortedModules.length > 0 && (
              <div id="curriculum">
                <h2 className="mb-4 text-xl font-bold">Nội dung khoá học</h2>
                <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4 text-sm">
                  <span>
                    {sortedModules.length} chương &bull; {totalLessons} bài học
                    &bull; {formatDuration(course.total_duration)} tổng thời
                    lượng
                  </span>
                  {/* <Button variant="ghost" size="sm" className="h-8">Mở rộng tất cả</Button> */}
                </div>

                <Accordion
                  type="multiple"
                  defaultValue={[String(sortedModules[0]?.id)]}
                  className="rounded-lg border divide-y overflow-hidden"
                >
                  {sortedModules.map((mod) => (
                    <AccordionItem
                      key={mod.id}
                      value={String(mod.id)}
                      className="border-0"
                    >
                      <AccordionTrigger className="px-5 py-4 bg-muted/30 hover:bg-muted/50 hover:no-underline font-semibold">
                        <div className="flex flex-1 items-center justify-between mr-4 text-left">
                          <span>{mod.title}</span>
                          <span className="text-xs font-normal text-muted-foreground ml-2">
                            {mod.lessons.length} bài học
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0">
                        <ul className="divide-y">
                          {mod.lessons.map((lesson) => {
                            const l = lesson as Lesson;
                            console.log({ l: l.is_free });

                            return (
                              <li
                                key={l.id}
                                className="flex items-center justify-between px-5 py-3 hover:bg-muted/10 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {l.type === "video" ? (
                                    <PlayCircle className="size-4 shrink-0 text-muted-foreground" />
                                  ) : (
                                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                                  )}
                                  <span className="text-sm text-muted-foreground group-hover:text-foreground">
                                    {l.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  {l.is_free ? (
                                    <LessonPreviewDialog
                                      lesson={l}
                                      course={course}
                                      trigger={
                                        <span className="ml-2 cursor-pointer text-xs text-indigo-600 underline hover:text-indigo-700">
                                          Xem trước
                                        </span>
                                      }
                                    />
                                  ) : (
                                    <Lock className="size-3.5" />
                                  )}
                                  <span>
                                    {formatLessonDuration(l.duration)}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* Requirements */}
            {course.requirements && course.requirements.length > 0 && (
              <div>
                <h2 className="mb-4 text-xl font-bold">Yêu cầu</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {course.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description */}
            {course.content && (
              <div>
                <h2 className="mb-4 text-xl font-bold">Mô tả</h2>
                <div
                  className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-a:text-indigo-600"
                  dangerouslySetInnerHTML={{ __html: course.content }}
                />
              </div>
            )}

            {/* Instructors */}
            {instructors.length > 0 && (
              <div>
                <h2 className="mb-6 text-xl font-bold">Giảng viên</h2>
                <div className="space-y-8">
                  {instructors.map((inst) => (
                    <div
                      key={inst.id}
                      className="rounded-lg border p-6 bg-muted/10"
                    >
                      <div className="flex flex-col sm:flex-row gap-6">
                        <Link href={`/instructors/${inst.id}`}>
                          <Avatar className="size-24 border-2 border-background shadow-sm">
                            <AvatarImage
                              src={getAssetUrl(inst.avatar)}
                              alt={inst.first_name || ""}
                              className="object-cover"
                            />
                            <AvatarFallback className="text-xl">
                              {(inst.first_name?.[0] || "") +
                                (inst.last_name?.[0] || "")}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 space-y-3">
                          <div>
                            <Link
                              href={`/instructors/${inst.id}`}
                              className="text-lg font-bold hover:underline"
                            >
                              {[inst.first_name, inst.last_name]
                                .filter(Boolean)
                                .join(" ") || inst.email}
                            </Link>
                            {inst.headline && (
                              <p className="text-muted-foreground">
                                {inst.headline}
                              </p>
                            )}
                          </div>

                          {/* Instructor Stats Placeholder */}
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            {/* Add logic to get real instructor stats if available */}
                            <div className="flex items-center gap-1.5">
                              <Star className="size-4 fill-amber-500 text-amber-500" />
                              <span>4.8 xếp hạng</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <PlayCircle className="size-4" />
                              <span>12 khoá học</span>
                            </div>
                          </div>

                          {inst.bio && (
                            <p className="text-sm text-balance leading-relaxed text-muted-foreground">
                              {inst.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div id="reviews">
              <h2 className="mb-6 text-xl font-bold">Đánh giá từ học viên</h2>
              <div className="flex flex-col md:flex-row gap-8 mb-8">
                <div className="shrink-0 flex flex-col items-center justify-center p-6 bg-muted/20 rounded-lg text-center aspect-square md:aspect-auto md:w-48 h-40">
                  <span className="text-5xl font-bold text-indigo-600 block mb-2">
                    {Number(averageRating).toFixed(1)}
                  </span>
                  <RatingStars
                    rating={averageRating}
                    size="md"
                    showValue={false}
                  />
                  <span className="text-xs text-muted-foreground mt-2 font-medium">
                    {approvedReviews.length} đánh giá
                  </span>
                </div>

                {/* Rating Bars */}
                <div className="flex-1 space-y-2 self-center">
                  {ratingDistribution.map(({ star, percentage }) => (
                    <div key={star} className="flex items-center gap-3 text-sm">
                      <div className="w-12 h-2 rounded-full overflow-hidden bg-muted">
                        <div
                          className="h-full bg-zinc-400"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                      <RatingStars
                        rating={star}
                        size="sm"
                        maxRating={5}
                        showValue={false}
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6">
                {approvedReviews.slice(0, 5).map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
                {approvedReviews.length > 5 && (
                  <Button variant="outline" className="w-full">
                    Xem thêm {approvedReviews.length - 5} đánh giá
                  </Button>
                )}
                {approvedReviews.length === 0 && (
                  <p className="text-muted-foreground">Chưa có đánh giá nào.</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar (Right) */}
          <div className="relative lg:col-span-1 order-1 lg:order-2">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Visual Media (Video/Image) */}
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800 bg-black">
                <div className="w-full h-full relative cursor-pointer group">
                  <Image
                    src={getAssetUrl(course.thumbnail)}
                    alt={course.title}
                    fill
                    className="object-cover transition-opacity group-hover:opacity-90"
                    priority
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 group-hover:scale-110 transition-transform">
                      <PlayCircle className="size-10 text-white fill-white/20" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-0 w-full text-center">
                    <span className="text-white text-sm font-semibold drop-shadow-md">
                      Xem giới thiệu khoá học
                    </span>
                  </div>
                </div>
              </div>

              <Card className="border-0 shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-800">
                <CardContent className="p-6 space-y-6">
                  {/* Price */}
                  <div className="flex items-baseline gap-3">
                    {course.price === 0 ? (
                      <span className="text-3xl font-bold text-green-600">
                        Miễn phí
                      </span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">
                          {formatPrice(
                            course.discount_price !== null &&
                              course.discount_price < course.price
                              ? course.discount_price
                              : course.price,
                          )}
                        </span>
                        {course.discount_price !== null &&
                          course.discount_price < course.price && (
                            <span className="text-lg text-muted-foreground line-through">
                              {formatPrice(course.price)}
                            </span>
                          )}
                      </>
                    )}
                  </div>

                  {course.discount_price !== null &&
                    course.discount_price < course.price && (
                      <Badge variant="destructive" className="animate-pulse">
                        Giảm{" "}
                        {Math.round(
                          ((course.price - course.discount_price) /
                            course.price) *
                            100,
                        )}
                        % ngay hôm nay
                      </Badge>
                    )}

                  <CourseActions
                    courseId={course.id}
                    courseSlug={course.slug}
                    price={course.price}
                    discountPrice={course.discount_price}
                  />

                  <p className="text-center text-xs text-muted-foreground">
                    Cam kết hoàn tiền trong 30 ngày
                  </p>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Khoá học bao gồm:</h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-3">
                        <MonitorPlay className="size-4" />
                        <span>
                          {formatDuration(course.total_duration)} video theo yêu
                          cầu
                        </span>
                      </li>
                      <li className="flex items-center gap-3">
                        <FileText className="size-4" />
                        <span>{totalLessons} bài học</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <DownloadIcon className="size-4" />
                        <span>Tài liệu tải xuống</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <MobileIcon className="size-4" />
                        <span>Truy cập trên thiết bị di động</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Award className="size-4" />
                        <span>Chứng chỉ hoàn thành</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between text-sm font-medium pt-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full">
                      Chia sẻ
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full">
                      Tặng khoá học
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Business Promo */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h4 className="font-bold">Đào tạo doanh nghiệp</h4>
                  <p className="text-sm text-muted-foreground">
                    Đăng ký cho đội ngũ của bạn để truy cập không giới hạn.
                  </p>
                  <Button variant="outline" className="w-full" size="sm">
                    E-Learning Business
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Related Courses */}
      {relatedCourses.length > 0 && (
        <section className="border-t bg-muted/20 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-6 text-xl font-bold">
              Các khoá học tin thường được mua cùng
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedCourses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// Helper icons
function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function MobileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}
