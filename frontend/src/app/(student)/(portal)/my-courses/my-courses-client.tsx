"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  Search,
  X,
  ArrowUpDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCourseImageSrc } from "@/lib/course-image";
import type { NormalizedEnrollment } from "@/lib/enrollment-helpers";
import type { Course, Lesson } from "@/types";

interface MyCoursesClientProps {
  activeEnrollments: NormalizedEnrollment[];
  completedEnrollments: NormalizedEnrollment[];
}

type SortOption = "recent" | "progress-asc" | "progress-desc" | "name-asc";

function sortEnrollments(
  enrollments: NormalizedEnrollment[],
  sort: SortOption
): NormalizedEnrollment[] {
  return [...enrollments].sort((a, b) => {
    const courseA = a.course_id as Course;
    const courseB = b.course_id as Course;

    switch (sort) {
      case "progress-asc":
        return (a.progress ?? 0) - (b.progress ?? 0);
      case "progress-desc":
        return (b.progress ?? 0) - (a.progress ?? 0);
      case "name-asc":
        return (courseA?.title ?? "").localeCompare(courseB?.title ?? "", "vi");
      case "recent":
      default: {
        const dateA = new Date(a.enrolled_at || a.date_created).getTime();
        const dateB = new Date(b.enrolled_at || b.date_created).getTime();
        return dateB - dateA;
      }
    }
  });
}

export function MyCoursesClient({
  activeEnrollments,
  completedEnrollments,
}: MyCoursesClientProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");

  const filterBySearch = (enrollments: NormalizedEnrollment[]) => {
    if (!search.trim()) return enrollments;
    const query = search.trim().toLowerCase();
    return enrollments.filter((enrollment) => {
      const course = enrollment.course_id as Course | null;
      if (!course || typeof course === "string") return false;
      return course.title?.toLowerCase().includes(query);
    });
  };

  const filteredActive = useMemo(
    () => sortEnrollments(filterBySearch(activeEnrollments), sort),
    [activeEnrollments, search, sort]
  );

  const filteredCompleted = useMemo(
    () => sortEnrollments(filterBySearch(completedEnrollments), sort),
    [completedEnrollments, search, sort]
  );

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm khoá học..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
              onClick={() => setSearch("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-48">
            <ArrowUpDown className="mr-2 size-4" />
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mới đăng ký</SelectItem>
            <SelectItem value="progress-desc">Tiến độ cao → thấp</SelectItem>
            <SelectItem value="progress-asc">Tiến độ thấp → cao</SelectItem>
            <SelectItem value="name-asc">Tên A → Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Đang học ({filteredActive.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Hoàn thành ({filteredCompleted.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {filteredActive.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <BookOpen className="mb-4 size-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {search
                    ? "Không tìm thấy khoá học phù hợp."
                    : "Bạn chưa có khoá học nào đang học."}
                </p>
                {!search && (
                  <Link href="/courses" className="mt-4">
                    <Button>Khám phá khoá học</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredActive.map((enrollment) => {
                const course = (enrollment.course_id ?? null) as Course | null;
                if (!course || typeof course === "string") return null;

                const lastLesson =
                  typeof enrollment.last_lesson_id === "object"
                    ? (enrollment.last_lesson_id as Lesson)
                    : null;
                const lastLessonSlug =
                  lastLesson && typeof lastLesson.slug === "string"
                    ? lastLesson.slug
                    : null;
                const lastLessonTitle =
                  lastLesson && typeof lastLesson.title === "string"
                    ? lastLesson.title
                    : null;
                const progressPercent = Math.round(enrollment.progress);

                return (
                  <Card key={enrollment.id} className="overflow-hidden gap-0 py-0">
                    <div className="relative aspect-video w-full overflow-hidden">
                      <Image
                        src={getCourseImageSrc(course)}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                      <Badge
                        className="absolute bottom-2 left-2"
                        variant="secondary"
                      >
                        {progressPercent}% hoàn thành
                      </Badge>
                    </div>
                    <CardContent className="space-y-3 p-4">
                      <h3 className="line-clamp-2 font-semibold leading-snug">
                        {course.title}
                      </h3>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Tiến độ</span>
                          <span className="font-medium text-foreground">
                            {progressPercent}%
                          </span>
                        </div>
                        <Progress value={progressPercent} />
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        <span>
                          Đăng ký{" "}
                          {formatDistanceToNow(
                            new Date(
                              enrollment.enrolled_at || enrollment.date_created
                            ),
                            { addSuffix: true, locale: vi }
                          )}
                        </span>
                      </div>

                      {lastLessonTitle && (
                        <p className="truncate text-xs text-muted-foreground">
                          Bài gần nhất: {lastLessonTitle}
                        </p>
                      )}

                      <Link
                        href={`/learn/${course.slug}${lastLessonSlug ? `/${lastLessonSlug}` : ""}`}
                      >
                        <Button className="mt-2 w-full" size="sm">
                          Tiếp tục học
                          <ArrowRight className="ml-1 size-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {filteredCompleted.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <CheckCircle className="mb-4 size-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {search
                    ? "Không tìm thấy khoá học phù hợp."
                    : "Bạn chưa hoàn thành khoá học nào."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCompleted.map((enrollment) => {
                const course = (enrollment.course_id ?? null) as Course | null;
                if (!course || typeof course === "string") return null;
                const progressPercent = Math.round(enrollment.progress);
                return (
                  <Card key={enrollment.id} className="overflow-hidden gap-0 py-0">
                    <div className="relative aspect-video w-full overflow-hidden">
                      <Image
                        src={getCourseImageSrc(course)}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                      <Badge className="absolute bottom-2 left-2">
                        <CheckCircle className="mr-1 size-3" />
                        Hoàn thành
                      </Badge>
                    </div>
                    <CardContent className="space-y-3 p-4">
                      <h3 className="line-clamp-2 font-semibold leading-snug">
                        {course.title}
                      </h3>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Tiến độ</span>
                          <span className="font-medium text-foreground">
                            {progressPercent}%
                          </span>
                        </div>
                        <Progress value={progressPercent} />
                      </div>

                      {enrollment.completed_at ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle className="size-3" />
                          <span>
                            Hoàn thành{" "}
                            {formatDistanceToNow(
                              new Date(enrollment.completed_at),
                              { addSuffix: true, locale: vi }
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle className="size-3" />
                          <span>Hoàn thành dựa trên tiến độ</span>
                        </div>
                      )}

                      <div className="mt-2 grid gap-2">
                        <Link href={`/learn/${course.slug}`}>
                          <Button variant="outline" className="w-full" size="sm">
                            Xem lại khóa học
                          </Button>
                        </Link>
                        <Link
                          href={`/my-certificates/enrollment/${enrollment.id}`}
                        >
                          <Button className="w-full" size="sm">
                            Xem chứng chỉ
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
