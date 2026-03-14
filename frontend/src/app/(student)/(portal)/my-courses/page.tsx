import { requireAuth } from "@/lib/dal";
import { partitionEnrollments } from "@/lib/enrollment-helpers";
import { recalcEnrollmentsProgress } from "@/lib/enrollment-progress";
import { getUserEnrollments } from "@/lib/queries/enrollments";
import {
  getRecommendedByCategories,
  getTrendingCourses,
} from "@/lib/queries/courses";
import { CourseRecommendationSection } from "@/components/features/course-recommendations";
import { MyCoursesClient } from "./my-courses-client";
import type { Course, Category } from "@/types";

export const dynamic = "force-dynamic";

export default async function MyCoursesPage() {
  const { token } = await requireAuth();
  const enrollmentsRaw = await getUserEnrollments(token);
  const enrollments = await recalcEnrollmentsProgress(enrollmentsRaw, token);

  const {
    normalized: allEnrollments,
    active: activeEnrollments,
    completed: completedEnrollments,
  } = partitionEnrollments(enrollments);

  // Extract enrolled course/category IDs for recommendations
  const enrolledCourseIds: string[] = [];
  const enrolledCategoryIds: string[] = [];
  for (const enrollment of allEnrollments) {
    const course = enrollment.course_id as Course | null;
    if (!course || typeof course === "string") continue;
    enrolledCourseIds.push(course.id);
    const cat = course.category_id;
    if (cat && typeof cat === "object") {
      const catId = (cat as Category).id;
      if (catId && !enrolledCategoryIds.includes(catId))
        enrolledCategoryIds.push(catId);
    } else if (typeof cat === "string" && !enrolledCategoryIds.includes(cat)) {
      enrolledCategoryIds.push(cat);
    }
  }

  const [recommendedCourses, trendingCourses] = await Promise.all([
    getRecommendedByCategories(enrolledCourseIds, enrolledCategoryIds, 8),
    getTrendingCourses(enrolledCourseIds, 8),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Khoá học của tôi</h1>
        <p className="text-muted-foreground">
          Quản lý và tiếp tục các khoá học bạn đã đăng ký
        </p>
      </div>

      <MyCoursesClient
        activeEnrollments={activeEnrollments}
        completedEnrollments={completedEnrollments}
      />

      <CourseRecommendationSection
        title="Có thể bạn quan tâm"
        subtitle="Dựa trên các danh mục bạn đang học"
        courses={recommendedCourses}
        viewAllHref="/courses"
      />

      <CourseRecommendationSection
        title="Khoá học nổi bật"
        subtitle="Được nhiều học viên đăng ký nhất"
        courses={trendingCourses}
        viewAllHref="/courses"
      />
    </div>
  );
}
