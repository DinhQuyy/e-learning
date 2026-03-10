import type { Metadata } from "next";
import Link from "next/link";
import {
  Code,
  Palette,
  BarChart3,
  Globe,
  Music,
  Camera,
  Briefcase,
  Heart,
  BookOpen,
  Folder,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCategories, type CategoryWithCount } from "@/lib/queries/categories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Danh mục",
  description: "Khám phá các danh mục khóa học đa dạng.",
};

const iconMap: Record<string, React.ElementType> = {
  code: Code,
  palette: Palette,
  "bar-chart": BarChart3,
  globe: Globe,
  music: Music,
  camera: Camera,
  briefcase: Briefcase,
  heart: Heart,
  "book-open": BookOpen,
};

function getIcon(iconName: string | null): React.ElementType {
  if (!iconName) return Folder;
  return iconMap[iconName] || Folder;
}

function hasParentCategory(parent: unknown): boolean {
  if (!parent) return false;
  if (typeof parent === "string") return parent.length > 0;
  if (typeof parent === "number") return true;
  if (typeof parent === "object") {
    return Boolean((parent as { id?: string | number | null }).id);
  }
  return false;
}

function sortChildCategories(a: CategoryWithCount, b: CategoryWithCount) {
  if (a.course_count !== b.course_count) {
    return b.course_count - a.course_count;
  }
  return a.name.localeCompare(b.name, "vi");
}

export default async function CategoriesPage() {
  const categories = await getCategories();
  const childCategories = categories
    .filter(
      (category) =>
        hasParentCategory(category.parent_id) && Number(category.course_count) > 0
    )
    .sort(sortChildCategories);
  const totalCourses = childCategories.reduce(
    (sum, category) => sum + Number(category.course_count ?? 0),
    0
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Danh mục khóa học</h1>
        <p className="mt-2 text-muted-foreground">
          Khám phá các danh mục con có khóa học đang được quan tâm.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{childCategories.length} danh mục con</Badge>
          <Badge variant="secondary">{totalCourses} khóa học</Badge>
        </div>
      </div>

      {childCategories.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {childCategories.map((cat) => {
            const Icon = getIcon(cat.icon);
            return (
              <Link key={cat.id} href={`/categories/${cat.slug}`}>
                <Card className="group h-full cursor-pointer overflow-hidden border-border/70 bg-card/80 transition-all duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg">
                  <CardContent className="flex h-full flex-col gap-4 p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                        <Icon className="size-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {cat.course_count} khóa học
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{cat.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {cat.description ??
                          "Xem các khóa học theo chuyên đề trong danh mục này."}
                      </p>
                    </div>
                    <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Xem danh mục
                      <ArrowUpRight className="size-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Folder className="size-16 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold">Chưa có danh mục phù hợp</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Hiện chưa có danh mục con nào có khóa học để hiển thị.
          </p>
        </div>
      )}
    </div>
  );
}
