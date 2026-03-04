import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readUser, readItems } from "@directus/sdk";
import {
  Globe,
  Linkedin,
  Twitter,
  Github,
  Youtube,
  Facebook,
  Mail,
  BookOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CourseCard } from "@/components/features/course-card";
import { directus, getAssetUrl } from "@/lib/directus";
import type { DirectusUser, Course } from "@/types";

export const dynamic = "force-dynamic";

interface InstructorPageProps {
  params: Promise<{ id: string }>;
}

const socialIcons: Record<string, React.ElementType> = {
  website: Globe,
  linkedin: Linkedin,
  twitter: Twitter,
  github: Github,
  youtube: Youtube,
  facebook: Facebook,
};

async function getInstructor(id: string): Promise<DirectusUser | null> {
  try {
    const user = await directus.request(
      readUser(id, {
        fields: [
          "id",
          "first_name",
          "last_name",
          "email",
          "avatar",
          "bio",
          "headline",
          "social_links",
          "date_created",
        ],
      })
    );
    return user as unknown as DirectusUser;
  } catch {
    return null;
  }
}

async function getInstructorCourses(
  instructorId: string
): Promise<Course[]> {
  try {
    const relations = await directus.request(
      readItems("courses_instructors", {
        filter: {
          user_id: { _eq: instructorId },
        },
        fields: [
          {
            course_id: [
              "id",
              "title",
              "slug",
              "description",
              "thumbnail",
              "price",
              "discount_price",
              "level",
              "average_rating",
              "total_enrollments",
              "total_lessons",
              "total_duration",
              "status",
              "date_created",
              { category_id: ["id", "name", "slug"] },
              {
                instructors: [
                  "id",
                  {
                    user_id: [
                      "id",
                      "first_name",
                      "last_name",
                      "email",
                      "avatar",
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })
    );

    return (relations as unknown as Array<{ course_id: Course }>)
      .map((r) => r.course_id)
      .filter((c) => c && c.status === "published");
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: InstructorPageProps): Promise<Metadata> {
  const { id } = await params;
  const instructor = await getInstructor(id);
  if (!instructor) {
    return { title: "Không tìm thấy giảng viên" };
  }
  const name =
    [instructor.first_name, instructor.last_name].filter(Boolean).join(" ") ||
    instructor.email;
  return {
    title: name,
    description:
      instructor.headline || `Trang cá nhân của giảng viên ${name}.`,
  };
}

export default async function InstructorPage({
  params,
}: InstructorPageProps) {
  const { id } = await params;
  const instructor = await getInstructor(id);

  if (!instructor) {
    notFound();
  }

  const courses = await getInstructorCourses(id);

  const name =
    [instructor.first_name, instructor.last_name].filter(Boolean).join(" ") ||
    instructor.email;

  const initials = instructor.first_name && instructor.last_name
    ? `${instructor.first_name[0]}${instructor.last_name[0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();

  const socialLinks = instructor.social_links || {};

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Card className="mb-8">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <Avatar className="size-24 sm:size-32">
              <AvatarImage
                src={getAssetUrl(instructor.avatar)}
                alt={name}
              />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold sm:text-3xl">{name}</h1>
              {instructor.headline && (
                <p className="mt-1 text-lg text-muted-foreground">
                  {instructor.headline}
                </p>
              )}
              <div className="mt-3 flex items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
                <span className="flex items-center gap-1">
                  <BookOpen className="size-4" />
                  {courses.length} khóa học
                </span>
              </div>
              {instructor.bio && (
                <>
                  <Separator className="my-4" />
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {instructor.bio}
                  </p>
                </>
              )}
              {Object.keys(socialLinks).length > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 sm:justify-start">
                  {Object.entries(socialLinks).map(([key, url]) => {
                    if (!url) return null;
                    const Icon = socialIcons[key] || Globe;
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        size="icon"
                        asChild
                      >
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={key}
                        >
                          <Icon className="size-4" />
                        </a>
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="icon" asChild>
                    <a href={`mailto:${instructor.email}`} aria-label="Email">
                      <Mail className="size-4" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-6 text-xl font-bold">
          Khóa học của {instructor.first_name || name}
        </h2>
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="size-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">
              Giảng viên chưa có khóa học nào.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
